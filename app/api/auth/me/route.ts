import { getCurrentUser, toPublicUser } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return jsonFail("UNAUTHORIZED", "Please login", 401);
  return jsonOk({ user: toPublicUser(user) });
}
