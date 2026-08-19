"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson, getErrorMessage } from "@/lib/api/client";
import { IconChevron, IconInfo, IconKeyboard, IconReload, IconSpeaker } from "@/components/iob-icons";

type Step = "login" | "forgot" | "otp" | "set_pin";

export function LoginCard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaLeft, setCaptchaLeft] = useState(120);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [otpProofToken, setOtpProofToken] = useState("");
  const [purpose, setPurpose] = useState<"setup" | "forgot_pin">("setup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    userId.trim().length >= 3 && pin.length === 6 && captchaInput.length >= 4;

  async function loadCaptcha() {
    const res = await apiJson<{ code: string }>("/api/auth/captcha", { method: "POST" });
    if (res.ok && res.data?.code) {
      setCaptchaCode(res.data.code);
      setCaptchaLeft(120);
      setCaptchaInput("");
    }
  }

  useEffect(() => {
    void loadCaptcha();
  }, []);

  useEffect(() => {
    if (step !== "login") return;
    const id = window.setInterval(() => {
      setCaptchaLeft((s) => {
        if (s <= 1) {
          void loadCaptcha();
          return 120;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  function mmss(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ userId, pin, captcha: captchaInput.replace(/\s/g, "") }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(getErrorMessage(res.raw, "Login failed"));
      void loadCaptcha();
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleCheckMobile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiJson<{ status?: string; message?: string }>(
      "/api/auth/check-mobile",
      { method: "POST", body: JSON.stringify({ mobile }) }
    );
    setLoading(false);
    if (!res.ok) {
      setError(getErrorMessage(res.raw, "Could not verify number"));
      return;
    }
    const status = res.data?.status;
    if (status === "not_found") {
      setError(res.data?.message ?? "Number not registered");
      return;
    }
    const nextPurpose = status === "otp_required" ? "setup" : "forgot_pin";
    setPurpose(nextPurpose);
    const sent = await apiJson("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, purpose: nextPurpose }),
    });
    if (!sent.ok) {
      setError(getErrorMessage(sent.raw, "Failed to send OTP"));
      return;
    }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiJson<{ otpProofToken?: string }>(
      "/api/auth/verify-otp",
      { method: "POST", body: JSON.stringify({ mobile, otp, purpose }) }
    );
    setLoading(false);
    if (!res.ok) {
      setError(getErrorMessage(res.raw, "Incorrect OTP"));
      return;
    }
    setOtpProofToken(res.data?.otpProofToken ?? "");
    setPin("");
    setConfirmPin("");
    setStep("set_pin");
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    setLoading(true);
    const path =
      purpose === "setup" ? "/api/auth/setup-pin" : "/api/auth/forgot-pin/reset";
    const res = await apiJson(path, {
      method: "POST",
      body: JSON.stringify({ pin, confirmPin, otpProofToken }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(getErrorMessage(res.raw, "Could not set PIN"));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  function listenCaptcha() {
    const digits = captchaCode.replace(/\s/g, "").split("").join(" ");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(digits));
  }

  return (
    <div className="w-full max-w-[400px] rounded-[16px] bg-white px-7 py-6 shadow-[0_8px_28px_rgba(0,0,0,0.16)] md:w-[430px] md:max-w-none">
      <h2 className="mb-4 text-center text-[15px] font-bold tracking-[0.16em] text-[#1a1a1a]">
        USERID LOGIN
        <span className="mx-auto mt-1.5 block h-[3px] w-10 rounded-full bg-[#00c4c8]" />
      </h2>

      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}

      {step === "login" ? (
        <form onSubmit={handleLogin}>
          <label className="block text-[13px] text-[#5a5a5a]">User ID</label>
          <div className="relative">
            <input
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="iob-input"
              autoComplete="username"
            />
            <span className="absolute right-0 top-1/2 flex -translate-y-1/2 gap-1.5 text-[#0b6a9a]">
              <IconInfo className="h-3.5 w-3.5" />
              <IconKeyboard className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-[14px] text-[#c41230]">
            Retail user: Login ID
            <br />
            Corporate user: Login ID.User ID
          </p>
          <button type="button" className="mt-1 ml-auto block w-full text-right text-[12px] text-[#0b6a9a]">
            Forgot user ID?
          </button>

          <label className="mt-3 block text-[13px] text-[#5a5a5a]">Password</label>
          <div className="relative">
            <input
              required
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="iob-input"
              autoComplete="current-password"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#0b6a9a]">
              <IconKeyboard className="h-3.5 w-3.5" />
            </span>
          </div>
          <button
            type="button"
            className="mt-1 ml-auto block w-full text-right text-[12px] text-[#0b6a9a]"
            onClick={() => {
              setError("");
              setStep("forgot");
            }}
          >
            Activate UserID/Forgot Password/PIN?
          </button>

          <label className="mt-3 block text-[13px] text-[#5a5a5a]">Select menu to start</label>
          <div className="relative">
            <select className="iob-input appearance-none pr-6">
              <option>Dashboard</option>
            </select>
            <IconChevron className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-[#666]" />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 flex-1 items-center justify-center rounded-sm bg-[#ececec] text-center font-serif text-[20px] font-medium tracking-[0.42em] text-[#333]">
              {captchaCode || "------"}
            </div>
            <div className="shrink-0 space-y-1 text-[11px] leading-none text-[#0b6a9a]">
              <button type="button" className="flex items-center gap-1" onClick={listenCaptcha}>
                <IconSpeaker className="h-3.5 w-3.5" /> Listen to the code
              </button>
              <button
                type="button"
                className="flex items-center gap-1"
                onClick={() => void loadCaptcha()}
              >
                <IconReload className="h-3.5 w-3.5" /> Reload ({mmss(captchaLeft)})
              </button>
            </div>
          </div>
          <div className="relative mt-2">
            <input
              required
              value={captchaInput}
              onChange={(e) =>
                setCaptchaInput(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="iob-input"
              placeholder="Type the text shown above"
              inputMode="numeric"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#888]">
              <IconKeyboard className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[13px] text-[#0b6a9a]">New here? Register</span>
            <button
              disabled={loading || !canSubmit}
              className="h-9 min-w-[108px] shrink-0 rounded-full bg-[#00829c] px-7 text-[14px] font-semibold text-white disabled:bg-[#cfcfcf]"
            >
              {loading ? "Please wait" : "Submit"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "forgot" ? (
        <form onSubmit={handleCheckMobile} className="space-y-3">
          <p className="text-sm text-gray-700">
            Enter the registered 10-digit mobile number to activate or reset PIN.
          </p>
          <input
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="iob-input"
            placeholder="Mobile number"
          />
          <div className="flex justify-between pt-2">
            <button type="button" className="text-sm text-[#0b6a9a]" onClick={() => setStep("login")}>
              Back
            </button>
            <button disabled={loading} className="rounded-full bg-[#00829c] px-6 py-2 text-sm text-white">
              {loading ? "Please wait" : "Send OTP"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-sm">OTP sent to mobile ending {mobile.slice(-4)}</p>
          <input
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="iob-input"
            placeholder="4-digit OTP"
          />
          <div className="flex justify-between">
            <button type="button" className="text-sm text-[#0b6a9a]" onClick={() => setStep("forgot")}>
              Back
            </button>
            <button disabled={loading} className="rounded-full bg-[#00829c] px-6 py-2 text-sm text-white">
              Verify OTP
            </button>
          </div>
        </form>
      ) : null}

      {step === "set_pin" ? (
        <form onSubmit={handleSetPin} className="space-y-3">
          <p className="text-sm">Set a 6-digit PIN</p>
          <input
            required
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="iob-input"
            placeholder="New PIN"
          />
          <input
            required
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="iob-input"
            placeholder="Confirm PIN"
          />
          <button disabled={loading} className="w-full rounded-full bg-[#00829c] py-2 text-sm text-white">
            Save PIN and continue
          </button>
        </form>
      ) : null}
    </div>
  );
}
