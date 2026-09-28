import { NextRequest, NextResponse } from "next/server";
import { query, type ContaInstagram } from "@/lib/db";
import { subscribeToWebhooks } from "@/lib/meta";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [conta] = await query<ContaInstagram>(
    "select id, ig_user_id, username, access_token, token_expira_em from ig_accounts where id = $1",
    [Number(id)]
  );
  if (!conta) {
    return NextResponse.json({ erro: "Conta não encontrada." }, { status: 404 });
  }

  try {
    await subscribeToWebhooks({ accessToken: conta.access_token });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
