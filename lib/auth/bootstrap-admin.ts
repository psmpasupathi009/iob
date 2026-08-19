import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isEnvAdminMobile, normalizeMobile } from "@/lib/auth/mobile";
import { generateAccountNumber } from "@/lib/money";

export async function findUserByLoginMobile(
  mobile91: string
): Promise<User | null> {
  const ten = mobile91.startsWith("91") ? mobile91.slice(2) : mobile91;
  const users = await prisma.user.findMany({
    where: { mobile: { in: [mobile91, ten] } },
  });
  return users[0] ?? null;
}

export async function findUserByUserId(userId: string): Promise<User | null> {
  const trimmed = userId.trim();
  const byUsername = await prisma.user.findUnique({
    where: { username: trimmed },
  });
  if (byUsername) return byUsername;

  const mobile = normalizeMobile(trimmed);
  if (mobile) return findUserByLoginMobile(mobile);
  return null;
}

/** Create env super-admin with no PIN so first login uses Forgot/Set PIN. */
export async function ensureEnvAdminUser(
  mobile91: string
): Promise<User | null> {
  if (!isEnvAdminMobile(mobile91)) return null;

  const existing = await findUserByLoginMobile(mobile91);
  const username =
    mobile91.startsWith("91") && mobile91.length === 12
      ? mobile91.slice(2)
      : mobile91;

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        mobile: mobile91,
        username: existing.username || username,
        role: "SUPER_ADMIN",
        isActive: true,
        name: existing.name || "Super Admin",
      },
    });
  }

  return prisma.user.create({
    data: {
      username,
      mobile: mobile91,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      accountNumber: generateAccountNumber(),
      isActive: true,
    },
  });
}
