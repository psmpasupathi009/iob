import type { TxnType } from "@prisma/client";

export type StatementTxn = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: TxnType;
};

export type StatementRow = StatementTxn & {
  dateLabel: string;
  debit: number | null;
  credit: number | null;
  carryingAmount: number;
};

export function computeOpeningBalance(
  transactions: StatementTxn[],
  before: Date
): number {
  let balance = 0;
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  for (const t of sorted) {
    if (t.date >= before) break;
    balance =
      t.type === "CR" ? balance + t.amount : Math.max(0, balance - t.amount);
  }
  return balance;
}

export function computeStatementRows(
  transactions: StatementTxn[],
  openingBalance: number
): StatementRow[] {
  let carrying = openingBalance;
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return sorted.map((t) => {
    const debit = t.type === "DR" ? t.amount : null;
    const credit = t.type === "CR" ? t.amount : null;
    carrying =
      t.type === "CR"
        ? carrying + t.amount
        : Math.max(0, carrying - t.amount);

    return {
      ...t,
      dateLabel: formatStatementDate(t.date),
      debit,
      credit,
      carryingAmount: Number(carrying.toFixed(2)),
    };
  });
}

export function formatStatementDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
