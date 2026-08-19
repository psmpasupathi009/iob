import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { addTxnSchema } from "@/lib/validations/auth.schema";
import { applyBalanceChange } from "@/lib/ledger";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonFail("FORBIDDEN", "Super admin only", 403);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = addTxnSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid transaction",
      400
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "USER") {
    return jsonFail("NOT_FOUND", "User not found", 404);
  }

  const result = await applyBalanceChange({
    userId: id,
    amount: parsed.data.amount,
    type: parsed.data.type,
    description: parsed.data.description,
  });

  return jsonOk({ message: "Transaction posted", balance: result.balance });
}
