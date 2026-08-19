"use client";

import { useEffect, useState } from "react";
import { apiJson, getErrorMessage } from "@/lib/api/client";
import { formatInrPlain } from "@/lib/money";

type AdminUser = {
  id: string;
  username: string;
  mobile: string;
  name: string;
  accountNumber: string;
  balance: number;
  pinSet: boolean;
};

export function AdminPanel({ onChanged }: { onChanged: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    mobile: "",
    pin: "",
    balance: "",
  });
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [setPin, setSetPin] = useState("");
  const [setBal, setSetBal] = useState("");
  const [txn, setTxn] = useState({ description: "", amount: "", type: "CR" as "CR" | "DR" });

  async function load(mobile?: string) {
    const q = mobile ? `?mobile=${encodeURIComponent(mobile)}` : "";
    const res = await apiJson<{ users: AdminUser[] }>(`/api/admin/users${q}`);
    if (res.ok && res.data) setUsers(res.data.users);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const res = await apiJson("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        balance: Number(form.balance || 0),
      }),
    });
    if (!res.ok) {
      setErr(getErrorMessage(res.raw, "Could not create user"));
      return;
    }
    setMsg("User created. They can login with User ID and PIN.");
    setForm({ name: "", username: "", mobile: "", pin: "", balance: "" });
    await load();
    onChanged();
  }

  async function saveSelected(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setErr("");
    setMsg("");
    const body: Record<string, unknown> = {};
    if (setPin) body.pin = setPin;
    if (setBal !== "") body.balance = Number(setBal);
    const res = await apiJson(`/api/admin/users/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setErr(getErrorMessage(res.raw, "Update failed"));
      return;
    }
    setMsg("User updated. Login again on their device if PIN changed.");
    setSetPin("");
    await load();
    onChanged();
  }

  async function addTxn(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setErr("");
    const res = await apiJson(`/api/admin/users/${selected.id}/transactions`, {
      method: "POST",
      body: JSON.stringify({
        description: txn.description,
        amount: Number(txn.amount),
        type: txn.type,
      }),
    });
    if (!res.ok) {
      setErr(getErrorMessage(res.raw, "Transaction failed"));
      return;
    }
    setMsg("Transaction posted on customer statement.");
    setTxn({ description: "", amount: "", type: "CR" });
    await load();
    onChanged();
  }

  return (
    <section className="mt-6 rounded-lg border border-cyan-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-iob-navy">Super Admin — demo bank desk</h2>
      {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createUser} className="space-y-2 rounded border p-3">
          <h3 className="font-semibold">Create customer</h3>
          <input
            required
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="User ID (login)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            required
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Mobile 10 digits"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <input
            required
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="6-digit PIN"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          />
          <input
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Opening balance"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
          />
          <button className="rounded bg-iob px-4 py-1.5 text-sm font-semibold text-white">
            Create user
          </button>
        </form>

        <div className="space-y-2 rounded border p-3">
          <h3 className="font-semibold">Find / update customer</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-2 py-1.5 text-sm"
              placeholder="Search mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <button
              type="button"
              className="rounded border px-3 text-sm"
              onClick={() => void load(search)}
            >
              Search
            </button>
          </div>
          <div className="max-h-40 overflow-auto text-sm">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelected(u);
                  setSetBal(String(u.balance));
                }}
                className={`mb-1 block w-full rounded px-2 py-1 text-left ${
                  selected?.id === u.id ? "bg-cyan-50" : "hover:bg-gray-50"
                }`}
              >
                {u.name} · {u.username} · {u.mobile.slice(-10)} · ₹{formatInrPlain(u.balance)}
              </button>
            ))}
          </div>
          {selected ? (
            <>
              <form onSubmit={saveSelected} className="space-y-2 border-t pt-2">
                <p className="text-xs text-gray-600">
                  Selected: {selected.name} ({selected.accountNumber})
                </p>
                <input
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="New 6-digit PIN (optional)"
                  value={setPin}
                  onChange={(e) => setSetPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <input
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="Set balance"
                  value={setBal}
                  onChange={(e) => setSetBal(e.target.value)}
                />
                <button className="rounded bg-iob-navy px-4 py-1.5 text-sm text-white">
                  Save PIN / balance
                </button>
              </form>
              <form onSubmit={addTxn} className="space-y-2 border-t pt-2">
                <p className="text-xs font-medium">Post transaction (shows on user statement)</p>
                <input
                  required
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="Description"
                  value={txn.description}
                  onChange={(e) => setTxn({ ...txn, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    required
                    className="flex-1 rounded border px-2 py-1.5 text-sm"
                    placeholder="Amount"
                    value={txn.amount}
                    onChange={(e) => setTxn({ ...txn, amount: e.target.value })}
                  />
                  <select
                    className="rounded border px-2 text-sm"
                    value={txn.type}
                    onChange={(e) => setTxn({ ...txn, type: e.target.value as "CR" | "DR" })}
                  >
                    <option value="CR">Cr</option>
                    <option value="DR">Dr</option>
                  </select>
                </div>
                <button className="rounded border border-iob px-4 py-1.5 text-sm text-iob">
                  Add to statement
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
