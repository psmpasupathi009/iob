import { prisma } from "@/lib/db/prisma";
import { requireAdmin, toPublicUser } from "@/lib/auth/session";
import { jsonFail, jsonOk } from "@/lib/api/response";
import { createUserSchema } from "@/lib/validations/auth.schema";
import { hashPin } from "@/lib/auth/pin";
import { normalizeMobile } from "@/lib/auth/mobile";
import { generateAccountNumber } from "@/lib/money";
import { seedYearStatement } from "@/lib/seed-statement";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonFail("FORBIDDEN", "Super admin only", 403);

  const { searchParams } = new URL(request.url);
  const mobileQ = searchParams.get("mobile")?.replace(/\D/g, "") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(mobileQ
        ? {
            OR: [
              { mobile: { contains: mobileQ } },
              { username: { contains: mobileQ } },
            ],
          }
        : q
          ? {
              OR: [
                { name: { contains: q } },
                { username: { contains: q } },
                { mobile: { contains: q } },
                { accountNumber: { contains: q } },
              ],
            }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk({
    users: users.map((u) => ({
      ...toPublicUser(u),
      pinSet: Boolean(u.pinHash),
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonFail("FORBIDDEN", "Super admin only", 403);

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid details",
      400
    );
  }

  const mobile = normalizeMobile(parsed.data.mobile);
  if (!mobile) return jsonFail("VALIDATION", "Enter a valid mobile number", 400);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: parsed.data.username }, { mobile }],
    },
  });
  if (existing) {
    return jsonFail("CONFLICT", "User ID or mobile already exists", 409);
  }

  const accountNumber =
    parsed.data.accountNumber?.replace(/\D/g, "") || generateAccountNumber();

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      mobile,
      role: "USER",
      pinHash: await hashPin(parsed.data.pin),
      accountNumber,
      balance: 0,
      isActive: true,
    },
  });

  await seedYearStatement(user.id, parsed.data.balance);

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  return jsonOk({
    message: "User created with 1-year statement",
    user: { ...toPublicUser(fresh!), pinSet: true },
  });
}
