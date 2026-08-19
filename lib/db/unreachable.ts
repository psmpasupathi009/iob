export function isDbUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; message?: string; code?: string };
  const msg = `${e.name ?? ""} ${e.message ?? ""} ${e.code ?? ""}`.toLowerCase();
  return (
    msg.includes("mongodb") ||
    msg.includes("server selection") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("p1001") ||
    msg.includes("p1017")
  );
}

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isDbUnreachableError(error) || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}
