type ApiEnvelope = {
  ok?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string } | string;
  message?: string;
};

async function parseJson(res: Response): Promise<ApiEnvelope> {
  try {
    return (await res.json()) as ApiEnvelope;
  } catch {
    return {};
  }
}

export function getErrorMessage(data: unknown, fallback: string): string {
  const body = data as ApiEnvelope;
  if (body?.error && typeof body.error === "object" && body.error.message) {
    return body.error.message;
  }
  if (typeof body?.error === "string") return body.error;
  if (typeof body?.message === "string") return body.message;
  return fallback;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; raw: unknown }> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const raw = await parseJson(res);
  const data = (raw.ok && raw.data != null ? raw.data : raw) as T;
  return { ok: res.ok && raw.ok !== false, status: res.status, data: res.ok ? data : null, raw };
}
