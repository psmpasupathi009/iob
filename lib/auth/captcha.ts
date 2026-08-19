import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  CAPTCHA_COOKIE,
  CAPTCHA_COOKIE_MAX_AGE_SEC,
} from "@/lib/auth/cookie-names";
import { CAPTCHA_LENGTH } from "@/lib/auth/constants";

function secret(): string {
  return process.env.JWT_SECRET ?? "captcha-dev";
}

export function generateCaptchaDigits(): string {
  const max = 10 ** CAPTCHA_LENGTH;
  return String(randomInt(0, max)).padStart(CAPTCHA_LENGTH, "0");
}

export function captchaHash(code: string): string {
  return createHmac("sha256", secret()).update(code).digest("hex");
}

export function attachCaptchaCookie(
  response: NextResponse,
  code: string
): NextResponse {
  const payload = `${captchaHash(code)}.${Date.now() + CAPTCHA_COOKIE_MAX_AGE_SEC * 1000}`;
  response.cookies.set(CAPTCHA_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CAPTCHA_COOKIE_MAX_AGE_SEC,
  });
  return response;
}

export function verifyCaptchaCookie(
  cookieValue: string | undefined,
  input: string
): boolean {
  if (!cookieValue || !input) return false;
  const [hash, expRaw] = cookieValue.split(".");
  const exp = Number(expRaw);
  if (!hash || !exp || Date.now() > exp) return false;
  const expected = captchaHash(input.replace(/\s/g, ""));
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function clearCaptchaCookie(response: NextResponse): NextResponse {
  response.cookies.set(CAPTCHA_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
