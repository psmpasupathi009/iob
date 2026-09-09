import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, toPublicUser } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { computeStatementRows } from "@/lib/statement";

function formatLastLogin(d: Date | null): string {
  if (!d) return "First login";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return jsonFail("UNAUTHORIZED", "Please login", 401);

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  const withCarrying = computeStatementRows(allTransactions, 0);
  const recent = withCarrying.slice(-25).reverse();

  return jsonOk({
    user: toPublicUser(user),
    lastLoginLabel: formatLastLogin(user.previousLoginAt ?? user.lastLoginAt),
    accountLabel: `${user.accountNumber}-${user.name.replace(/\s+/g, " ").toUpperCase()}`,
    balance: user.balance,
    transactions: recent.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      dateLabel: t.dateLabel,
      description: t.description,
      amount: t.amount,
      type: t.type,
      debit: t.debit,
      credit: t.credit,
      carryingAmount: t.carryingAmount,
    })),
  });
}
