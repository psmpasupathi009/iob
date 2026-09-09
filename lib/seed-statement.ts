import type { TxnType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const CR_DESCRIPTIONS = [
  "SALARY CREDIT",
  "NEFT-IN / HDFC BANK",
  "IMPS-IN / REF",
  "CASH DEPOSIT - BRANCH",
  "INTEREST CREDIT",
  "UPI/REV / REFUND",
  "DIVIDEND CREDIT",
];

const DR_DESCRIPTIONS = [
  "ATM WDL / SELF",
  "UPI/DR / MERCHANT",
  "NEFT-OUT / TRANSFER",
  "POS DEBIT / RETAIL",
  "SI DEBIT / EMI",
  "CHQ WDL",
  "ECS DEBIT",
];

type PlannedTxn = {
  date: Date;
  description: string;
  amount: number;
  type: TxnType;
};

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 100) * 100;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildYearPlan(targetBalance: number): PlannedTxn[] {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = addDays(end, -365);

  const count = 28;
  const txns: PlannedTxn[] = [];

  const initialCredit =
    targetBalance > 0
      ? Math.max(randomBetween(targetBalance * 0.25, targetBalance * 0.45), 5000)
      : randomBetween(8000, 20000);

  txns.push({
    date: start,
    description: "Opening balance credited",
    amount: initialCredit,
    type: "CR",
  });

  let running = initialCredit;

  for (let i = 1; i < count - 1; i++) {
    const dayOffset = Math.floor((365 * i) / (count - 1));
    const date = addDays(start, dayOffset);
    const isCredit = Math.random() < 0.42;

    if (isCredit) {
      const amount = randomBetween(3000, 45000);
      txns.push({
        date,
        description: pick(CR_DESCRIPTIONS),
        amount,
        type: "CR",
      });
      running += amount;
    } else {
      const maxDr = Math.max(500, running - 1000);
      const amount = randomBetween(500, Math.min(maxDr, 12000));
      txns.push({
        date,
        description: pick(DR_DESCRIPTIONS),
        amount,
        type: "DR",
      });
      running = Math.max(0, running - amount);
    }
  }

  const diff = Number((targetBalance - running).toFixed(2));
  if (diff !== 0) {
    txns.push({
      date: end,
      description: diff > 0 ? "Quarterly interest credit" : "Service charge debit",
      amount: Math.abs(diff),
      type: diff > 0 ? "CR" : "DR",
    });
    running = targetBalance;
  }

  return txns.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function seedYearStatement(
  userId: string,
  targetBalance: number
): Promise<{ transactionCount: number; balance: number }> {
  const plan = buildYearPlan(targetBalance);
  const finalBalance = plan.reduce((bal, t) => {
    return t.type === "CR" ? bal + t.amount : Math.max(0, bal - t.amount);
  }, 0);

  await prisma.$transaction([
    ...plan.map((t) =>
      prisma.transaction.create({
        data: {
          userId,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
        },
      })
    ),
    prisma.user.update({
      where: { id: userId },
      data: { balance: finalBalance },
    }),
  ]);

  return { transactionCount: plan.length, balance: finalBalance };
}
