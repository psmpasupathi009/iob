import { prisma } from "@/lib/db/prisma";
import { requireAdmin, toPublicUser } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { patchUserSchema } from "@/lib/validations/auth.schema";
import { hashPin } from "@/lib/auth/pin";
import { applyBalanceChange } from "@/lib/ledger";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonFail("FORBIDDEN", "Super admin only", 403);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid details",
      400
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "USER") {
    return jsonFail("NOT_FOUND", "User not found", 404);
  }

  if (parsed.data.pin) {
    await prisma.user.update({
      where: { id },
      data: {
        pinHash: await hashPin(parsed.data.pin),
        failedPinAttempts: 0,
        pinLockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
  }

  if (typeof parsed.data.balance === "number") {
    await applyBalanceChange({
      userId: id,
      newBalance: parsed.data.balance,
      description: "Balance updated by bank",
    });
  }

  if (parsed.data.name) {
    await prisma.user.update({
      where: { id },
      data: { name: parsed.data.name },
    });
  }

  const fresh = await prisma.user.findUnique({ where: { id } });
  return jsonOk({
    message: "User updated",
    user: { ...toPublicUser(fresh!), pinSet: Boolean(fresh?.pinHash) },
  });
}
