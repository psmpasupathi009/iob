import { NextResponse } from "next/server";
import {
  attachCaptchaCookie,
  generateCaptchaDigits,
} from "@/lib/auth/captcha";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const code = generateCaptchaDigits();
  const spaced = code.split("").join(" ");
  const response = jsonOk({
    code: spaced,
    expiresIn: 120,
  });
  return attachCaptchaCookie(response, code);
}

export async function POST() {
  return GET();
}
