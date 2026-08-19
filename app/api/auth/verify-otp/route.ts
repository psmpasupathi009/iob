import { prisma } from "@/lib/db/prisma";
import { signOtpProofToken } from "@/lib/auth/jwt";
import { isEnvAdminMobile, normalizeMobile } from "@/lib/auth/mobile";
import {
  ensureEnvAdminUser,
  findUserByLoginMobile,
} from "@/lib/auth/bootstrap-admin";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { rateLimit, clientRateKey } from "@/lib/rate-limit";
import { verifyOtpSms } from "@/lib/services/two-factor.service";
import { verifyOtpSchema } from "@/lib/validations/auth.schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail("VALIDATION", "Invalid OTP request", 400);
    }

    const mobile = normalizeMobile(parsed.data.mobile);
    if (!mobile) {
      return jsonFail("VALIDATION", "Enter a valid 10-digit mobile number", 400);
    }

    const limited = await rateLimit(
      clientRateKey(request, "verify-otp", mobile),
      10,
      15 * 60 * 1000
    );
    if (!limited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many OTP checks. Try again in ${limited.retryAfterSec}s`,
        429,
        { retryAfterSec: limited.retryAfterSec }
      );
    }

    const { otp, purpose } = parsed.data;

    const session = await prisma.otpSession.findFirst({
      where: {
        mobile,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return jsonFail("VALIDATION", "OTP expired or not found. Request a new one.", 400);
    }

    const ok = await verifyOtpSms(session.sessionId, otp);
    if (!ok) {
      return jsonFail("VALIDATION", "Incorrect OTP", 400);
    }

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    if (purpose === "setup") {
      let user = await findUserByLoginMobile(mobile);
      if (!user && isEnvAdminMobile(mobile)) {
        user = await ensureEnvAdminUser(mobile);
      }
      if (!user || !user.isActive) {
        return jsonFail("NOT_FOUND", "Number not registered. Contact admin.", 404);
      }
    } else {
      const user = await findUserByLoginMobile(mobile);
      if (!user || !user.isActive || !user.pinHash) {
        return jsonFail("FORBIDDEN", "Unable to reset PIN for this number", 400);
      }
    }

    const otpProofToken = await signOtpProofToken({ mobile, purpose });

    return jsonOk({
      verified: true,
      otpProofToken,
      requiresPinSetup: purpose === "setup",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-otp error", message);
    return jsonFail(
      "SERVER_ERROR",
      process.env.NODE_ENV === "development"
        ? `Failed to verify OTP: ${message}`
        : "Failed to verify OTP",
      502
    );
  }
}
