"use client";

import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api/client";
import { IconLogout } from "@/components/iob-icons";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await apiJson("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="inline-flex items-center gap-1 rounded border border-red-400 px-3 py-1.5 text-xs font-semibold text-[#ff6b6b] hover:bg-white/10"
    >
      Logout
      <IconLogout className="h-3.5 w-3.5 text-red-300" />
    </button>
  );
}
