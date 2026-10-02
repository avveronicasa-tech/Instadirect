import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";
import { sendMessage } from "@/lib/meta";

const JANELA_HORAS = 24;
// Limite conservador pra não estourar a taxa da Meta (~1.6 msg/s).
const ESPERA_ENTRE_ENVIOS_MS = 700;

export async function POST(req: NextRequest) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });
  }

  const { texto, botaoTexto, botaoUrl, destinatarios } = await req.json();

  if (!texto?.trim()) {
    return NextResponse.json({ erro: "Escreva a mensagem." }, { status: 400 });
  }
  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    return NextResponse.json({ erro: "Selecione pelo menos uma pessoa." }, { status: 400 });
  }
  if (destinatarios.length > 150) {
    return NextResponse.json(
      { erro: "Selecione no máximo 150 pessoas por disparo (limite da função)." },
      { status: 400 }
    );
  }

  const contatos = await query<{
    ig_user_id: string;
    username: string | null;
    ultima_interacao_em: string;
  }>(
    `select ig_user_id, username, ultima_interacao_em from contacts
     where account_id = $1 and ig_user_id = any($2::text[])`,
    [conta.id, destinatarios]
  );

  const agora = Date.now();
  let enviados = 0;
  let expirados = 0;
  const falhas: string[] = [];

  for (const c of contatos) {
    const dentroDaJanela =
      agora - new Date(c.ultima_interacao_em).getTime() < JANELA_HORAS * 60 * 60 * 1000;

    if (!dentroDaJanela) {
      expirados++;
      continue;
    }

    const textoPersonalizado = texto.replaceAll(
      "{{first_name}}",
      c.username || "tudo bem"
    );

    try {
      await sendMessage({
        accessToken: conta.access_token,
        igUserId: conta.ig_user_id,
        recipientId: c.ig_user_id,
        text: textoPersonalizado,
        buttonText: botaoTexto || undefined,
        buttonUrl: botaoUrl || undefined,
      });
      enviados++;
      await query(
        `insert into events (tipo, ig_user_id, username, payload, account_id)
         values ('disparo', $1, $2, $3, $4)`,
        [c.ig_user_id, c.username, JSON.stringify({ texto: textoPersonalizado }), conta.id]
      );
    } catch {
      falhas.push(c.username || c.ig_user_id);
    }

    // Pequena pausa entre envios pra respeitar o limite de taxa da Meta.
    await new Promise((r) => setTimeout(r, ESPERA_ENTRE_ENVIOS_MS));
  }

  return NextResponse.json({ ok: true, enviados, expirados, falhas });
}
