import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, tokenFromPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { erro: "ADMIN_PASSWORD não configurada nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  const { senha } = await req.json().catch(() => ({ senha: "" }));

  if (senha !== adminPassword) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const token = await tokenFromPassword(adminPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
