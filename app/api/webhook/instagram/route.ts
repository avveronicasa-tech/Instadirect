import { NextRequest, NextResponse } from "next/server";
import { getSetting, getContaPorIgUserId, query, type ContaInstagram } from "@/lib/db";
import { verifySignature } from "@/lib/webhook-signature";
import { replyToComment, sendMessage } from "@/lib/meta";

// 1) A Meta chama esse GET uma vez, pra confirmar que o dono do site controla
//    essa URL. Ela manda um "challenge" e espera receber o mesmo valor de volta,
//    mas só se o verify_token bater com o que foi cadastrado no painel.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = await getSetting("verify_token");

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Verificação falhou", { status: 403 });
}

// 2) Toda vez que alguém comenta ou manda DM, a Meta faz um POST aqui.
// O mesmo webhook recebe eventos de TODAS as contas conectadas — por isso
// o primeiro passo é sempre descobrir de qual conta veio o evento.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = await getSetting("ig_app_secret");

  if (appSecret) {
    const valido = await verifySignature({
      appSecret,
      rawBody,
      signatureHeader: req.headers.get("x-hub-signature-256"),
    });
    if (!valido) {
      return new NextResponse("Assinatura inválida", { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);

  for (const entry of payload.entry ?? []) {
    // O "id" do entry é o ID da conta do Instagram dona do webhook —
    // é assim que sabemos qual conta conectada deve responder.
    const conta = entry.id ? await getContaPorIgUserId(entry.id) : null;
    if (!conta) continue; // evento de uma conta que não está conectada aqui

    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        await tratarComentario(change.value, conta);
      }
    }
    for (const evento of entry.messaging ?? []) {
      if (evento.message?.text) {
        await tratarMensagemDireta(evento, conta);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function tratarComentario(
  value: { text?: string; from?: { id: string; username?: string }; id?: string },
  conta: ContaInstagram
) {
  const texto = (value.text || "").toLowerCase();
  const autor = value.from;
  if (!texto || !autor) return;

  const automacoes = await query<{
    id: number;
    palavra_chave: string;
    tipo_correspondencia: string;
    dm_texto: string;
    botao_texto: string | null;
    botao_url: string | null;
    responder_comentario: boolean;
    comentario_texto: string | null;
  }>("select * from automations where ativa = true and account_id = $1", [
    conta.id,
  ]);

  const encontrada = automacoes.find((a) => {
    const chave = a.palavra_chave.toLowerCase();
    return a.tipo_correspondencia === "exata"
      ? texto.trim() === chave
      : texto.includes(chave);
  });

  if (!encontrada) return;

  await query(
    `insert into contacts (ig_user_id, username, account_id)
     values ($1, $2, $3)
     on conflict (account_id, ig_user_id) do update set username = excluded.username`,
    [autor.id, autor.username ?? null, conta.id]
  );

  await query(
    `insert into events (tipo, ig_user_id, username, automation_id, payload, account_id)
     values ('comentario', $1, $2, $3, $4, $5)`,
    [autor.id, autor.username ?? null, encontrada.id, JSON.stringify(value), conta.id]
  );

  if (encontrada.responder_comentario && value.id && encontrada.comentario_texto) {
    await replyToComment({
      accessToken: conta.access_token,
      commentId: value.id,
      text: encontrada.comentario_texto,
    }).catch(() => null);
  }

  // A resposta ao comentário "fura" a janela de 24h (permitida 1x por comentário,
  // até 7 dias) — é assim que a pessoa recebe a primeira DM sem ter escrito antes.
  await sendMessage({
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: autor.id,
    text: encontrada.dm_texto,
    buttonText: encontrada.botao_texto ?? undefined,
    buttonUrl: encontrada.botao_url ?? undefined,
  }).catch(() => null);
}

async function tratarMensagemDireta(
  evento: { sender?: { id: string }; message?: { text?: string } },
  conta: ContaInstagram
) {
  const texto = (evento.message?.text || "").toLowerCase();
  const remetente = evento.sender?.id;
  if (!texto || !remetente) return;

  const automacoes = await query<{
    id: number;
    palavra_chave: string;
    tipo_correspondencia: string;
    dm_texto: string;
    botao_texto: string | null;
    botao_url: string | null;
  }>("select * from automations where ativa = true and account_id = $1", [
    conta.id,
  ]);

  const encontrada = automacoes.find((a) => {
    const chave = a.palavra_chave.toLowerCase();
    return a.tipo_correspondencia === "exata"
      ? texto.trim() === chave
      : texto.includes(chave);
  });

  if (!encontrada) return;

  await query(
    `insert into contacts (ig_user_id, account_id)
     values ($1, $2)
     on conflict (account_id, ig_user_id) do nothing`,
    [remetente, conta.id]
  );

  await query(
    `insert into events (tipo, ig_user_id, automation_id, payload, account_id)
     values ('dm', $1, $2, $3, $4)`,
    [remetente, encontrada.id, JSON.stringify(evento), conta.id]
  );

  await sendMessage({
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: remetente,
    text: encontrada.dm_texto,
    buttonText: encontrada.botao_texto ?? undefined,
    buttonUrl: encontrada.botao_url ?? undefined,
  }).catch(() => null);
}
