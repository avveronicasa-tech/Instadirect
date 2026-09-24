import { NextRequest, NextResponse } from "next/server";
import { getSetting, query } from "@/lib/db";
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
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = await getSetting("ig_app_secret");
  const accessToken = await getSetting("ig_access_token");
  const igUserId = await getSetting("ig_user_id");

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

  // A Meta agrupa vários eventos dentro de entry[].changes[] ou entry[].messaging[].
  for (const entry of payload.entry ?? []) {
    // Comentário em post/reel.
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        await tratarComentario(change.value, { accessToken, igUserId });
      }
    }
    // DM recebida diretamente (inclui resposta a story).
    for (const evento of entry.messaging ?? []) {
      if (evento.message?.text) {
        await tratarMensagemDireta(evento, { accessToken, igUserId });
      }
    }
  }

  // A Meta só se importa com o status 200 — o processamento de fato acontece
  // acima, de forma síncrona, pra manter as coisas simples nesse estágio.
  return NextResponse.json({ ok: true });
}

async function tratarComentario(
  value: { text?: string; from?: { id: string; username?: string }; id?: string },
  ctx: { accessToken: string | null; igUserId: string | null }
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
  }>("select * from automations where ativa = true");

  const encontrada = automacoes.find((a) => {
    const chave = a.palavra_chave.toLowerCase();
    return a.tipo_correspondencia === "exata"
      ? texto.trim() === chave
      : texto.includes(chave);
  });

  if (!encontrada) return;

  await query(
    `insert into events (tipo, ig_user_id, username, automation_id, payload)
     values ('comentario', $1, $2, $3, $4)`,
    [autor.id, autor.username ?? null, encontrada.id, JSON.stringify(value)]
  );

  if (!ctx.accessToken || !ctx.igUserId) return;

  if (encontrada.responder_comentario && value.id && encontrada.comentario_texto) {
    await replyToComment({
      accessToken: ctx.accessToken,
      commentId: value.id,
      text: encontrada.comentario_texto,
    }).catch(() => null);
  }

  // A resposta ao comentário "fura" a janela de 24h (permitida 1x por comentário,
  // até 7 dias) — é assim que a pessoa recebe a primeira DM sem ter escrito antes.
  await sendMessage({
    accessToken: ctx.accessToken,
    igUserId: ctx.igUserId,
    recipientId: autor.id,
    text: encontrada.dm_texto,
    buttonText: encontrada.botao_texto ?? undefined,
    buttonUrl: encontrada.botao_url ?? undefined,
  }).catch(() => null);
}

async function tratarMensagemDireta(
  evento: {
    sender?: { id: string };
    message?: { text?: string };
  },
  ctx: { accessToken: string | null; igUserId: string | null }
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
  }>("select * from automations where ativa = true");

  const encontrada = automacoes.find((a) => {
    const chave = a.palavra_chave.toLowerCase();
    return a.tipo_correspondencia === "exata"
      ? texto.trim() === chave
      : texto.includes(chave);
  });

  if (!encontrada) return;

  await query(
    `insert into events (tipo, ig_user_id, automation_id, payload)
     values ('dm', $1, $2, $3)`,
    [remetente, encontrada.id, JSON.stringify(evento)]
  );

  if (!ctx.accessToken || !ctx.igUserId) return;

  await sendMessage({
    accessToken: ctx.accessToken,
    igUserId: ctx.igUserId,
    recipientId: remetente,
    text: encontrada.dm_texto,
    buttonText: encontrada.botao_texto ?? undefined,
    buttonUrl: encontrada.botao_url ?? undefined,
  }).catch(() => null);
}
