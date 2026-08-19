import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  accessSessionMatches,
  signAccessToken,
  verifyAccessToken,
  type AccessTokenPayload,
} from "@/lib/auth/jwt";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SEC,
} from "@/lib/auth/cookie-names";

export { ACCESS_COOKIE };

export type PublicUser = {
  id: string;
  username: string;
  mobile: string;
  name: string;
  role: UserRole;
  accountNumber: string;
  balance: number;
  lastLoginAt: string | null;
  previousLoginAt: string | null;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    mobile: user.mobile,
    name: user.name,
    role: user.role,
    accountNumber: user.accountNumber,
    balance: user.balance,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    previousLoginAt: user.previousLoginAt?.toISOString() ?? null,
  };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function issueAuthTokens(user: User): Promise<{
  accessToken: string;
  user: PublicUser;
}> {
  const accessToken = await signAccessToken({
    userId: user.id,
    username: user.username,
    mobile: user.mobile,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      previousLoginAt: user.lastLoginAt,
      lastLoginAt: new Date(),
      failedPinAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return {
    accessToken,
    user: toPublicUser(updated),
  };
}

export function attachAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string }
): NextResponse {
  response.cookies.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(ACCESS_COOKIE_MAX_AGE_SEC)
  );
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}

export async function getAccessPayloadFromRequest(
  request: Request
): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies();
  const cookieToken =
    cookieStore.get(ACCESS_COOKIE)?.value ??
    request.headers.get("cookie")?.match(new RegExp(`${ACCESS_COOKIE}=([^;]+)`))?.[1];
  if (!cookieToken) return null;
  return verifyAccessToken(decodeURIComponent(cookieToken));
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const payload = await getAccessPayloadFromRequest(request);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  if (!accessSessionMatches(payload, user.sessionVersion)) return null;
  return user;
}

export async function requireUser(request: Request): Promise<User | null> {
  return getCurrentUser(request);
}

export async function requireAdmin(request: Request): Promise<User | null> {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}
