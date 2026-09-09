import type { TxnType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function applyBalanceChange(input: {
  userId: string;
  newBalance?: number;
  amount?: number;
  type?: TxnType;
  description: string;
  date?: Date;
}): Promise<{ balance: number }> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found");

  let next = user.balance;
  let amount = 0;
  let type: TxnType = "CR";

  if (typeof input.newBalance === "number") {
    const diff = Number((input.newBalance - user.balance).toFixed(2));
    next = input.newBalance;
    if (diff === 0) {
      return { balance: user.balance };
    }
    amount = Math.abs(diff);
    type = diff > 0 ? "CR" : "DR";
  } else if (typeof input.amount === "number" && input.type) {
    amount = input.amount;
    type = input.type;
    next =
      type === "CR"
        ? user.balance + amount
        : Math.max(0, user.balance - amount);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: next },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount,
        type,
        description: input.description,
        ...(input.date ? { date: input.date } : {}),
      },
    }),
  ]);

  return { balance: next };
}
