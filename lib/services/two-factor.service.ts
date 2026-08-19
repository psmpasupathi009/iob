type TwoFactorResponse = {
  Status: string;
  Details: string;
  OTP?: string;
};

const DEFAULT_TEMPLATE = "mlf";

function getApiKey(): string {
  const key = process.env.TWO_FACTOR_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing TWO_FACTOR_API_KEY environment variable");
  }
  return key;
}

function getTemplateName(): string {
  return (process.env.TWO_FACTOR_TEMPLATE_NAME || DEFAULT_TEMPLATE).trim();
}

export function toTwoFactorPhone(mobile91: string): string {
  const digits = mobile91.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 10) {
    return digits;
  }
  throw new Error(`Invalid mobile for 2factor SMS OTP: expected 10 digits`);
}

async function callSmsApi(path: string): Promise<TwoFactorResponse> {
  const url = `https://2factor.in/API/V1/${getApiKey()}/SMS/${path}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const raw = await res.text();
  let data: TwoFactorResponse;
  try {
    data = JSON.parse(raw) as TwoFactorResponse;
  } catch {
    throw new Error(`2factor returned non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
  }

  return data;
}

export async function sendOtpSms(
  mobile91: string
): Promise<{ sessionId: string }> {
  const phone = toTwoFactorPhone(mobile91);
  const template = encodeURIComponent(getTemplateName());
  const data = await callSmsApi(`${phone}/AUTOGEN3/${template}`);

  if (data.Status !== "Success" || !data.Details) {
    throw new Error(data.Details || "Failed to send SMS OTP");
  }

  return { sessionId: data.Details };
}

export async function verifyOtpSms(
  sessionId: string,
  otp: string
): Promise<boolean> {
  const data = await callSmsApi(
    `VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(otp)}`
  );

  const details = (data.Details || "").toLowerCase();
  if (details.includes("otp matched") || details.includes("matched")) {
    return true;
  }

  return data.Status === "Success";
}
