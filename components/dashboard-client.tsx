"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { AdminPanel } from "@/components/admin-panel";
import { apiJson } from "@/lib/api/client";
import { formatInr } from "@/lib/money";
import {
  IconArrow,
  IconCard,
  IconHome,
  IconMore,
  IconSwap,
  IconWallet,
} from "@/components/iob-icons";

type Txn = {
  id: string;
  dateLabel: string;
  description: string;
  amount: number;
  type: "CR" | "DR";
};

type Dash = {
  user: {
    name: string;
    role: "SUPER_ADMIN" | "USER";
    username: string;
    accountNumber: string;
  };
  lastLoginLabel: string;
  accountLabel: string;
  balance: number;
  transactions: Txn[];
};

const SIDEBAR = [
  { label: "Home", icon: IconHome, active: true },
  { label: "Accounts", icon: IconWallet, active: false },
  { label: "Transactions", icon: IconSwap, active: false },
  { label: "Cards", icon: IconCard, active: false },
  { label: "Services", icon: IconWallet, active: false },
  { label: "More", icon: IconMore, active: false },
];

const QUICK = [
  { label: "ASBA", icon: IconWallet },
  { label: "Service Requests", icon: IconSwap },
  { label: "Apply for loan", icon: IconCard },
  { label: "Deposit calculator", icon: IconWallet },
];

export function DashboardClient() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [showBal, setShowBal] = useState(false);
  const [tab, setTab] = useState<"txn" | "summary">("txn");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiJson<Dash>("/api/account/dashboard");
    if (!res.ok || !res.data) {
      setError("Could not load account");
      return;
    }
    setDash(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="p-8 text-red-600">{error}</p>;
  }
  if (!dash) {
    return <p className="p-8 text-sm text-gray-500">Loading account…</p>;
  }

  const isAdmin = dash.user.role === "SUPER_ADMIN";

  return (
    <div className="min-h-full bg-iob-page pb-16 md:pb-0">
      <SiteHeader variant="dashboard" userName={dash.user.name} />

      <div className="flex">
        <aside className="relative hidden w-[92px] shrink-0 flex-col bg-[#00334e] py-2 text-white md:flex">
          {SIDEBAR.map((item) => (
            <div
              key={item.label}
              className={`relative mx-1.5 mb-1 flex flex-col items-center rounded py-3 text-[11px] ${
                item.active ? "bg-[#1a6a80]" : "hover:bg-white/10"
              }`}
            >
              {item.active ? (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#7ee0c8]" />
              ) : null}
              <item.icon className="mb-1 h-6 w-6" />
              {item.label}
            </div>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 py-4 lg:flex-row lg:gap-4 lg:px-5">
          <main className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-iob-navy sm:text-[26px]">Welcome, {dash.user.name}</h1>
            <p className="text-[13px] text-[#444]">Last login: {dash.lastLoginLabel}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              {QUICK.map((x) => (
                <span
                  key={x.label}
                  className="flex min-w-[88px] flex-col items-center gap-1 rounded-md bg-white px-3 py-2 text-[11px] text-iob-navy shadow-sm"
                >
                  <x.icon className="h-5 w-5 text-iob" />
                  {x.label}
                </span>
              ))}
              <span className="flex min-w-[56px] flex-col items-center justify-center rounded-md bg-white px-3 py-2 text-iob-navy shadow-sm">
                <IconMore className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(220px,280px)]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SummaryTile
                  title="Operative"
                  value="01"
                  action={showBal ? formatInr(dash.balance) : "View Balance"}
                  onAction={() => setShowBal(true)}
                />
                <SummaryTile title="Deposits & Investments" value="00" action="View Balance" />
                <SummaryTile title="Credit cards" value="" action="Credit Card Portal" extra="Set IOB Credit card as Beneficiary" tone="light" />
                <SummaryTile title="Loans" value="00" action="View Balance" tone="light" />
              </div>
              <div className="rounded-md bg-white p-4 text-[13px] shadow-sm">
                <div className="mb-3 font-semibold text-iob-navy">Funds Transfer</div>
                <button type="button" className="mb-3 flex w-full items-center justify-between text-left">
                  <span>
                    Self Transfer to own account
                    <span className="block text-[11px] text-[#666]">(Within IOB only)</span>
                  </span>
                  <IconArrow className="h-4 w-4 text-[#0b6a9a]" />
                </button>
                <button type="button" className="flex w-full items-center justify-between text-left">
                  <span>
                    Quick Transfer
                    <span className="block text-[11px] text-[#666]">Non-beneficiary</span>
                  </span>
                  <IconArrow className="h-4 w-4 text-[#0b6a9a]" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex gap-6 overflow-x-auto border-b text-sm">
                <button
                  className={`pb-2 ${tab === "txn" ? "border-b-2 border-iob font-semibold text-iob" : "text-gray-500"}`}
                  onClick={() => setTab("txn")}
                >
                  Recent transactions
                </button>
                <button
                  className={`pb-2 ${tab === "summary" ? "border-b-2 border-iob font-semibold text-iob" : "text-gray-500"}`}
                  onClick={() => setTab("summary")}
                >
                  Account Summary
                </button>
              </div>
              <label className="text-xs text-gray-500">Select account</label>
              <select className="mb-3 mt-1 w-full max-w-md rounded border border-gray-300 px-2 py-1.5 text-sm">
                <option>{dash.accountLabel}</option>
              </select>

              {tab === "summary" ? (
                <div className="rounded bg-slate-50 p-4 text-sm">
                  <p>
                    Account: <strong>{dash.user.accountNumber}</strong>
                  </p>
                  <p className="mt-2">
                    Available balance:{" "}
                    <strong className="text-iob-navy">{formatInr(dash.balance)}</strong>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2 font-medium">Date</th>
                      <th className="font-medium">Description</th>
                      <th className="text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-gray-400">
                          No transactions yet
                        </td>
                      </tr>
                    ) : (
                      dash.transactions.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100">
                          <td className="py-2">{t.dateLabel}</td>
                          <td>{t.description}</td>
                          <td
                            className={`text-right font-semibold ${
                              t.type === "DR" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            ₹ {inr(t.amount)} {t.type === "DR" ? "Dr" : "Cr"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              )}
              <p className="mt-3 text-right text-sm text-[#0b6a9a]">View detailed statement</p>
            </div>

            {isAdmin ? <AdminPanel onChanged={() => void load()} /> : null}
          </main>

          <aside className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex">
            <button
              type="button"
              className="rounded-md border border-[#7eb8d4] bg-white px-3 py-2 text-left text-[13px] text-[#0b6a9a]"
            >
              Report fraudulent transaction
            </button>
            <div className="overflow-hidden rounded-md bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-iob-navy">Pre-approved loans</span>
                <span className="text-[#0b6a9a] underline">View all</span>
              </div>
              <p className="text-[12px] text-iob-navy">
                Buy your dream car
                <br />
                <strong>Loan upto ₹ 10,00,000.00</strong>
              </p>
              <div className="relative mt-2 h-24">
                <Image src="/images/promo-loan.png" alt="Car loan" fill className="object-contain" />
              </div>
              <button className="mt-2 rounded border border-iob-navy px-4 py-1 text-xs text-iob-navy">
                Apply
              </button>
            </div>
            <div className="overflow-hidden rounded-md bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-iob-navy">Offers & schemes</span>
                <span className="text-[#0b6a9a] underline">View all</span>
              </div>
              <p className="text-[12px] text-iob-navy">
                Get a term insurance and protect your loved ones
              </p>
              <div className="relative mt-2 h-24">
                <Image src="/images/promo-offers.png" alt="Offers" fill className="object-contain" />
              </div>
              <button className="mt-2 rounded border border-iob-navy px-4 py-1 text-xs text-iob-navy">
                Apply
              </button>
            </div>
            <div className="rounded-md bg-linear-to-r from-amber-50 to-sky-50 p-3 text-[12px]">
              <p className="font-medium text-iob-navy">Enjoying the IOB experience?</p>
              <p className="text-[#0b6a9a] underline">Rate us</p>
              <div className="relative mt-2 h-14">
                <Image src="/images/promo-rate.png" alt="Rate us" fill className="object-contain" />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#00334e] bg-[#00334e] text-white md:hidden">
        {SIDEBAR.map((item) => (
          <div
            key={item.label}
            className={`flex flex-1 flex-col items-center py-2 text-[10px] ${
              item.active ? "bg-[#3db8c9]" : ""
            }`}
          >
            <item.icon className="mb-0.5 h-5 w-5" />
            {item.label}
          </div>
        ))}
      </nav>
    </div>
  );
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function SummaryTile({
  title,
  value,
  action,
  extra,
  onAction,
  tone = "teal",
}: {
  title: string;
  value: string;
  action: string;
  extra?: string;
  onAction?: () => void;
  tone?: "teal" | "light";
}) {
  const dark = tone === "teal";
  return (
    <div className={`flex min-h-[120px] flex-col rounded-md p-3 ${dark ? "bg-iob-tile text-white" : "bg-[#c5e8f0] text-iob-navy"}`}>
      <div className="text-[13px]">{title}</div>
      {value ? <div className="mt-2 text-2xl font-bold">{value}</div> : <div className="mt-6" />}
      {extra ? <p className={`mt-1 text-[10px] ${dark ? "text-cyan-50" : "text-[#0b6a9a]"}`}>{extra}</p> : null}
      <button
        type="button"
        onClick={onAction}
        className={`mt-2 text-left text-[12px] underline ${dark ? "text-cyan-50" : "text-[#0b6a9a]"}`}
      >
        {action}
      </button>
    </div>
  );
}
