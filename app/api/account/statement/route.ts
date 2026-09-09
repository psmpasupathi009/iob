import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, toPublicUser } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import {
  computeOpeningBalance,
  computeStatementRows,
} from "@/lib/statement";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return jsonFail("UNAUTHORIZED", "Please login", 401);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);

  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : defaultFrom;
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return jsonFail("VALIDATION", "Invalid date range", 400);
  }

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  const openingBalance = computeOpeningBalance(allTransactions, from);

  const periodTransactions = allTransactions.filter(
    (t) => t.date >= from && t.date <= to
  );

  const rows = computeStatementRows(periodTransactions, openingBalance);
  const closingBalance =
    rows.length > 0
      ? rows[rows.length - 1]!.carryingAmount
      : openingBalance;

  return jsonOk({
    user: toPublicUser(user),
    accountLabel: `${user.accountNumber}-${user.name.replace(/\s+/g, " ").toUpperCase()}`,
    from: from.toISOString(),
    to: to.toISOString(),
    openingBalance,
    closingBalance,
    balance: user.balance,
    transactions: rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      dateLabel: r.dateLabel,
      description: r.description,
      debit: r.debit,
      credit: r.credit,
      carryingAmount: r.carryingAmount,
      type: r.type,
      amount: r.amount,
    })),
  });
}
