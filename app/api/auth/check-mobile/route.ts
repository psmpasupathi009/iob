import { isDbUnreachableError, withDbRetry } from "@/lib/db/unreachable";
import {
  isEnvAdminMobile,
  normalizeMobile,
} from "@/lib/auth/mobile";
import { ensureEnvAdminUser, findUserByLoginMobile } from "@/lib/auth/bootstrap-admin";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { rateLimit, clientRateKey } from "@/lib/rate-limit";
import { checkUserSchema } from "@/lib/validations/auth.schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail("VALIDATION", "Enter a valid 10-digit mobile number", 400);
    }

    const mobile = normalizeMobile(parsed.data.mobile);
    if (!mobile) {
      return jsonFail("VALIDATION", "Enter a valid 10-digit mobile number", 400);
    }

    const limited = await rateLimit(
      clientRateKey(request, "check-mobile", mobile),
      20,
      15 * 60 * 1000
    );
    if (!limited.allowed) {
      return jsonFail(
        "RATE_LIMITED",
        `Too many attempts. Try again in ${limited.retryAfterSec}s`,
        429,
        { retryAfterSec: limited.retryAfterSec }
      );
    }

    await ensureEnvAdminUser(mobile);

    const user = await withDbRetry(() => findUserByLoginMobile(mobile));

    if (user?.isActive) {
      return jsonOk({
        status: (user.pinHash ? "pin" : "otp_required") as "pin" | "otp_required",
        isAdmin: user.role === "SUPER_ADMIN",
      });
    }

    if (isEnvAdminMobile(mobile)) {
      return jsonOk({ status: "otp_required" as const, isAdmin: true });
    }

    return jsonOk({
      status: "not_found" as const,
      message: "This number is not registered. Contact your admin.",
    });
  } catch (error) {
    console.error("check-mobile error", error);
    return jsonFail(
      isDbUnreachableError(error) ? "DB_UNAVAILABLE" : "SERVER_ERROR",
      isDbUnreachableError(error)
        ? "Database unreachable. Check DATABASE_URL."
        : "Could not verify this number.",
      isDbUnreachableError(error) ? 503 : 500
    );
  }
}
