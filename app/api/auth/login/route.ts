import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { isDbUnreachableError } from "@/lib/db/unreachable";
import { findUserByUserId } from "@/lib/auth/bootstrap-admin";
import {
  isPinLocked,
  pinLockRetryAfterSec,
  PIN_LOCK_MINUTES,
  PIN_MAX_ATTEMPTS,
  verifyPin,
} from "@/lib/auth/pin";
import { attachAuthCookies, issueAuthTokens } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { rateLimit, clientRateKey } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth.schema";
import {
  clearCaptchaCookie,
  verifyCaptchaCookie,
} from "@/lib/auth/captcha";
import { CAPTCHA_COOKIE } from "@/lib/auth/cookie-names";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "Invalid login details",
        400
      );
    }

    const cookieStore = await cookies();
    const captchaOk = verifyCaptchaCookie(
      cookieStore.get(CAPTCHA_COOKIE)?.value,
      parsed.data.captcha
    );
    if (!captchaOk) {
      return jsonFail("VALIDATION", "Invalid captcha. Reload and try again.", 400);
    }

    const limited = await rateLimit(
      clientRateKey(request, "login", parsed.data.userId),
      10,
      15 * 60 * 1000
    );
    if (!limited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many login attempts. Try again in ${limited.retryAfterSec}s`,
        429,
        { retryAfterSec: limited.retryAfterSec }
      );
    }

    const user = await findUserByUserId(parsed.data.userId);

    if (!user || !user.isActive || !user.pinHash) {
      const res = jsonFail("INVALID_CREDENTIALS", "Invalid User ID or PIN", 401);
      return clearCaptchaCookie(res);
    }

    if (isPinLocked(user.pinLockedUntil)) {
      const retryAfterSec = pinLockRetryAfterSec(user.pinLockedUntil);
      return jsonFail(
        "PIN_LOCKED",
        `PIN locked after too many attempts. Try again in ${retryAfterSec}s.`,
        423,
        { retryAfterSec }
      );
    }

    const ok = await verifyPin(parsed.data.pin, user.pinHash);
    if (!ok) {
      const lockUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000);

      const locked = await prisma.user.updateMany({
        where: {
          id: user.id,
          failedPinAttempts: { gte: PIN_MAX_ATTEMPTS - 1 },
          OR: [{ pinLockedUntil: null }, { pinLockedUntil: { lte: new Date() } }],
        },
        data: {
          failedPinAttempts: 0,
          pinLockedUntil: lockUntil,
        },
      });

      if (locked.count > 0) {
        return jsonFail(
          "PIN_LOCKED",
          `Too many incorrect PIN attempts. Try again in ${PIN_LOCK_MINUTES * 60}s.`,
          423,
          { retryAfterSec: PIN_LOCK_MINUTES * 60 }
        );
      }

      const bumped = await prisma.user.updateMany({
        where: {
          id: user.id,
          failedPinAttempts: { lt: PIN_MAX_ATTEMPTS - 1 },
          OR: [{ pinLockedUntil: null }, { pinLockedUntil: { lte: new Date() } }],
        },
        data: { failedPinAttempts: { increment: 1 } },
      });

      const attempts =
        bumped.count > 0 ? user.failedPinAttempts + 1 : user.failedPinAttempts;
      const remaining = Math.max(0, PIN_MAX_ATTEMPTS - attempts);

      const res = jsonFail(
        "INVALID_CREDENTIALS",
        remaining > 0
          ? `Invalid User ID or PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : "Invalid User ID or PIN",
        401,
        { attemptsRemaining: remaining }
      );
      return clearCaptchaCookie(res);
    }

    const tokens = await issueAuthTokens(user);
    const response = jsonOk({
      message: "Login successful",
      user: tokens.user,
    });
    return clearCaptchaCookie(attachAuthCookies(response, tokens));
  } catch (error) {
    console.error("login error", error);
    return jsonFail(
      isDbUnreachableError(error) ? "DB_UNAVAILABLE" : "SERVER_ERROR",
      isDbUnreachableError(error)
        ? "Database unreachable. Check DATABASE_URL."
        : "Login failed",
      isDbUnreachableError(error) ? 503 : 500
    );
  }
}
