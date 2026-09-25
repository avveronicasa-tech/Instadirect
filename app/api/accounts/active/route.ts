import { NextRequest, NextResponse } from "next/server";
import { CONTA_ATIVA_COOKIE } from "@/lib/active-account";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ erro: "Informe o id da conta." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CONTA_ATIVA_COOKIE, String(id), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
