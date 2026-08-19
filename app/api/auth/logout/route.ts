import { clearAuthCookies } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api/response";

export async function POST() {
  return clearAuthCookies(jsonOk({ message: "Logged out" }));
}
