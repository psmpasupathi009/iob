import { prisma } from "@/lib/db/prisma";
import { withDbRetry } from "@/lib/db/unreachable";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return withDbRetry(async () => {
    const now = new Date();
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      const resetAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, retryAfterSec: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)
        ),
      };
    }

    const bumped = await prisma.rateLimit.updateMany({
      where: {
        key,
        count: { lt: limit },
        resetAt: { gt: now },
      },
      data: { count: { increment: 1 } },
    });

    if (bumped.count === 0) {
      const latest = await prisma.rateLimit.findUnique({ where: { key } });
      return {
        allowed: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil(
            ((latest?.resetAt.getTime() ?? now.getTime()) - now.getTime()) / 1000
          )
        ),
      };
    }

    return { allowed: true, retryAfterSec: 0 };
  });
}

export function clientRateKey(
  request: Request,
  prefix: string,
  extra?: string
): string {
  const vercel = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = vercel || real || fwd || "unknown";
  return extra ? `${prefix}:${extra}:${ip}` : `${prefix}:${ip}`;
}
