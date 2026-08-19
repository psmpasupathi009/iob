import { prisma } from "@/lib/db/prisma";
import { consumeOtpProof } from "@/lib/auth/otp-proof";
import { hashPin } from "@/lib/auth/pin";
import { attachAuthCookies, issueAuthTokens } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { setupPinSchema } from "@/lib/validations/auth.schema";
import { rateLimit, clientRateKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limited = await rateLimit(clientRateKey(request, "setup-pin"), 10, 15 * 60 * 1000);
    if (!limited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many attempts. Try again in ${limited.retryAfterSec}s`,
        429,
        { retryAfterSec: limited.retryAfterSec }
      );
    }

    const body = await request.json();
    const parsed = setupPinSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "Invalid request",
        400
      );
    }

    const proof = await consumeOtpProof(parsed.data.otpProofToken, "setup");
    if (!proof) {
      return jsonFail(
        "UNAUTHORIZED",
        "OTP verification expired or already used. Please verify again.",
        401
      );
    }

    const user = await prisma.user.findUnique({ where: { mobile: proof.mobile } });
    if (!user || !user.isActive) {
      return jsonFail("NOT_FOUND", "Number not registered. Contact admin.", 404);
    }

    if (user.pinHash) {
      return jsonFail("CONFLICT", "PIN already set. Use login or forgot PIN.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash: await hashPin(parsed.data.pin),
        sessionVersion: { increment: 1 },
      },
    });

    const tokens = await issueAuthTokens(updated);
    const response = jsonOk({
      message: "PIN set successfully",
      user: tokens.user,
    });
    return attachAuthCookies(response, tokens);
  } catch (error) {
    console.error("setup-pin error", error);
    return jsonFail("SERVER_ERROR", "Failed to set PIN", 500);
  }
}
