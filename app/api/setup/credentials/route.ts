import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

function gerarToken(tamanho = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET() {
  const [appId, verifyToken, username, userId] = await Promise.all([
    getSetting("ig_app_id"),
    getSetting("verify_token"),
    getSetting("ig_username"),
    getSetting("ig_user_id"),
  ]);

  return NextResponse.json({
    appId,
    verifyToken,
    contaConectada: Boolean(userId),
    username,
  });
}

export async function POST(req: NextRequest) {
  const { appId, appSecret } = await req.json();

  if (!appId || !appSecret) {
    return NextResponse.json(
      { erro: "Informe o ID do app e a chave secreta." },
      { status: 400 }
    );
  }

  await setSetting("ig_app_id", appId);
  await setSetting("ig_app_secret", appSecret);

  // Só gera um verify_token novo se ainda não existir um.
  const existente = await getSetting("verify_token");
  if (!existente) {
    await setSetting("verify_token", gerarToken());
  }

  return NextResponse.json({ ok: true });
}
