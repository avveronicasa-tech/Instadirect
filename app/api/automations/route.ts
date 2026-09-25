import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

export async function GET() {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json([]);

  const automacoes = await query(
    "select * from automations where account_id = $1 order by created_at desc",
    [conta.id]
  );
  return NextResponse.json(automacoes);
}

export async function POST(req: NextRequest) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json(
      { erro: "Conecte uma conta do Instagram antes de criar automações." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const {
    nome,
    palavra_chave,
    tipo_correspondencia = "contem",
    dm_texto,
    botao_texto,
    botao_url,
    responder_comentario = true,
    comentario_texto,
    lembrete_minutos,
    lembrete_texto,
  } = body;

  if (!nome || !palavra_chave || !dm_texto) {
    return NextResponse.json(
      { erro: "Preencha nome, palavra-chave e a mensagem de DM." },
      { status: 400 }
    );
  }

  const [automacao] = await query(
    `insert into automations
      (nome, palavra_chave, tipo_correspondencia, dm_texto, botao_texto, botao_url,
       responder_comentario, comentario_texto, lembrete_minutos, lembrete_texto, account_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning *`,
    [
      nome,
      palavra_chave,
      tipo_correspondencia,
      dm_texto,
      botao_texto || null,
      botao_url || null,
      responder_comentario,
      comentario_texto || null,
      lembrete_minutos || null,
      lembrete_texto || null,
      conta.id,
    ]
  );

  return NextResponse.json(automacao, { status: 201 });
}
