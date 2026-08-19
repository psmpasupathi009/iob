import { prisma } from "@/lib/db/prisma";
import { isEnvAdminMobile, normalizeMobile } from "@/lib/auth/mobile";
import { findUserByLoginMobile, ensureEnvAdminUser } from "@/lib/auth/bootstrap-admin";
import { rateLimit, clientRateKey } from "@/lib/rate-limit";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { sendOtpSms } from "@/lib/services/two-factor.service";
import { sendOtpSchema } from "@/lib/validations/auth.schema";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail("VALIDATION", "Invalid request", 400);
    }

    const mobile = normalizeMobile(parsed.data.mobile);
    if (!mobile) {
      return jsonFail("VALIDATION", "Enter a valid 10-digit mobile number", 400);
    }

    const ipLimited = await rateLimit(clientRateKey(request, "otp-ip"), 10, 15 * 60 * 1000);
    if (!ipLimited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many OTP requests. Try again in ${ipLimited.retryAfterSec}s`,
        429,
        { retryAfterSec: ipLimited.retryAfterSec }
      );
    }

    const { purpose } = parsed.data;
    const limited = await rateLimit(`otp:${mobile}`, 3, 15 * 60 * 1000);
    if (!limited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many OTP requests. Try again in ${limited.retryAfterSec}s`,
        429,
        { retryAfterSec: limited.retryAfterSec }
      );
    }

    if (isEnvAdminMobile(mobile)) {
      await ensureEnvAdminUser(mobile);
    }

    const user = await findUserByLoginMobile(mobile);

    if (purpose === "setup") {
      const allowed =
        (user && user.isActive && !user.pinHash) ||
        (!user && isEnvAdminMobile(mobile));
      if (!allowed) {
        return jsonFail("FORBIDDEN", "OTP setup is not available for this number", 400);
      }
    } else {
      if (!user || !user.isActive || !user.pinHash) {
        return jsonFail("FORBIDDEN", "Unable to reset PIN for this number", 400);
      }
      if (user.role !== "SUPER_ADMIN") {
        return jsonFail(
          "FORBIDDEN",
          "Customer PIN reset is done by Super Admin from the dashboard.",
          400
        );
      }
    }

    const { sessionId } = await sendOtpSms(mobile);

    await prisma.otpSession.deleteMany({ where: { mobile, purpose } });
    await prisma.otpSession.create({
      data: {
        mobile,
        sessionId,
        purpose,
        verified: false,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    return jsonOk({
      message: "OTP sent successfully",
      expiresIn: 600,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-otp error", message);
    return jsonFail(
      "SERVER_ERROR",
      process.env.NODE_ENV === "development"
        ? `Failed to send OTP: ${message}`
        : "Failed to send OTP. Please try again.",
      502
    );
  }
}
