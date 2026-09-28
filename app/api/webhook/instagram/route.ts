import { NextRequest, NextResponse } from "next/server";
import { getSetting, getContaPorIgUserId, query, type ContaInstagram } from "@/lib/db";
import { verifySignature } from "@/lib/webhook-signature";
import { replyToComment, sendMessage } from "@/lib/meta";
import { avancarFluxo, encontrarProximoPorOpcao } from "@/lib/flow-engine";
import type { FlowGraph, FlowNode } from "@/lib/flow-types";

function logErro(contexto: string) {
  return (e: unknown) => console.error(contexto, e);
}

// A Meta chama esse GET uma vez, pra confirmar que o dono do site controla
// essa URL. Ela manda um "challenge" e espera receber o mesmo valor de volta,
// mas só se o verify_token bater com o que foi cadastrado no painel.
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

// Toda vez que alguém comenta ou manda DM, a Meta faz um POST aqui.
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
    const conta = entry.id ? await getContaPorIgUserId(entry.id) : null;
    if (!conta) continue;

    try {
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
    } catch (e) {
      // Um erro num evento não pode derrubar o webhook (a Meta reenviaria).
      console.error("Erro ao tratar evento do webhook:", e);
    }
  }

  return NextResponse.json({ ok: true });
}

type FluxoRow = { id: number; grafo: FlowGraph };

async function buscarFlowRunPendente(contaId: number, igUserId: string) {
  const linhas = await query<{
    flow_id: number;
    no_atual: string;
    atualizado_em: string;
    grafo: FlowGraph;
  }>(
    `select fr.flow_id, fr.no_atual, fr.atualizado_em, f.grafo
     from flow_runs fr
     join flows f on f.id = fr.flow_id
     where fr.account_id = $1 and fr.ig_user_id = $2
     limit 1`,
    [contaId, igUserId]
  );
  const linha = linhas[0];
  if (!linha) return null;
  return {
    flowId: linha.flow_id,
    grafo: linha.grafo,
    noAtual: linha.no_atual,
    atualizadoEm: linha.atualizado_em,
  };
}

async function buscarFluxoPorPalavra(
  contaId: number,
  texto: string
): Promise<FluxoRow | null> {
  const fluxos = await query<{ id: number; gatilho_palavra: string; grafo: FlowGraph }>(
    "select id, gatilho_palavra, grafo from flows where ativo = true and account_id = $1 and gatilho_palavra is not null and gatilho_palavra <> ''",
    [contaId]
  );
  const encontrado = fluxos.find((f) =>
    texto.toLowerCase().includes(f.gatilho_palavra.toLowerCase())
  );
  return encontrado ? { id: encontrado.id, grafo: encontrado.grafo } : null;
}

type Automacao = {
  id: number;
  palavra_chave: string;
  tipo_correspondencia: string;
  dm_texto: string;
  botao_texto: string | null;
  botao_url: string | null;
  responder_comentario: boolean;
  comentario_texto: string | null;
};

async function buscarAutomacao(
  contaId: number,
  texto: string
): Promise<Automacao | undefined> {
  const automacoes = await query<Automacao>(
    "select * from automations where ativa = true and account_id = $1",
    [contaId]
  );
  const t = texto.toLowerCase();
  return automacoes.find((a) => {
    const chave = a.palavra_chave.toLowerCase();
    return a.tipo_correspondencia === "exata" ? t.trim() === chave : t.includes(chave);
  });
}

async function tratarComentario(
  value: { text?: string; from?: { id: string; username?: string }; id?: string },
  conta: ContaInstagram
) {
  const texto = value.text || "";
  const autor = value.from;
  if (!texto || !autor) return;
  // Ignora comentários da própria conta (ex: a nossa resposta pública),
  // senão o sistema responderia a si mesmo em loop.
  if (autor.id === conta.ig_user_id) return;

  const fluxo = await buscarFluxoPorPalavra(conta.id, texto);
  const automacao = fluxo ? undefined : await buscarAutomacao(conta.id, texto);
  if (!fluxo && !automacao) return;

  await query(
    `insert into contacts (ig_user_id, username, account_id)
     values ($1, $2, $3)
     on conflict (account_id, ig_user_id) do update set username = excluded.username`,
    [autor.id, autor.username ?? null, conta.id]
  );

  // Fluxo tem prioridade sobre automação simples quando as duas batem.
  if (fluxo) {
    await query(
      `insert into events (tipo, ig_user_id, username, payload, account_id)
       values ('comentario', $1, $2, $3, $4)`,
      [autor.id, autor.username ?? null, JSON.stringify(value), conta.id]
    );
    if (value.id) {
      await replyToComment({
        accessToken: conta.access_token,
        commentId: value.id,
        text: "Te mandei no privado! 📩",
      }).catch(logErro("Falha ao responder o comentário:"));
    }
    await avancarFluxo({
      grafo: fluxo.grafo,
      flowId: fluxo.id,
      conta,
      igUserId: autor.id,
      entrada: { tipo: "inicio" },
      commentId: value.id,
    });
    return;
  }

  if (!automacao) return;

  await query(
    `insert into events (tipo, ig_user_id, username, automation_id, payload, account_id)
     values ('comentario', $1, $2, $3, $4, $5)`,
    [autor.id, autor.username ?? null, automacao.id, JSON.stringify(value), conta.id]
  );

  if (automacao.responder_comentario && value.id && automacao.comentario_texto) {
    await replyToComment({
      accessToken: conta.access_token,
      commentId: value.id,
      text: automacao.comentario_texto,
    }).catch(logErro("Falha ao responder o comentário:"));
  }

  // Resposta privada ao comentário (usa o ID do comentário, não o da pessoa).
  await sendMessage({
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: autor.id,
    commentId: value.id,
    text: automacao.dm_texto,
    buttonText: automacao.botao_texto ?? undefined,
    buttonUrl: automacao.botao_url ?? undefined,
  }).catch(logErro("Falha ao enviar a DM (resposta privada):"));
}

async function tratarMensagemDireta(
  evento: {
    sender?: { id: string };
    message?: { text?: string; is_echo?: boolean; quick_reply?: { payload?: string } };
  },
  conta: ContaInstagram
) {
  const texto = evento.message?.text || "";
  const payloadBotao = evento.message?.quick_reply?.payload;
  const remetente = evento.sender?.id;
  if (!texto || !remetente) return;
  // Ignora as mensagens que a própria conta enviou (eco), senão o sistema
  // reagiria às próprias respostas em loop.
  if (evento.message?.is_echo || remetente === conta.ig_user_id) return;

  await query(
    `insert into contacts (ig_user_id, account_id)
     values ($1, $2)
     on conflict (account_id, ig_user_id) do nothing`,
    [remetente, conta.id]
  );

  // 1) Já existe uma conversa de fluxo em andamento com essa pessoa?
  const pendente = await buscarFlowRunPendente(conta.id, remetente);
  if (pendente) {
    const noAtual: FlowNode | undefined = pendente.grafo.nos[pendente.noAtual];

    if (noAtual?.tipo === "esperar") {
      const passouMs = Date.now() - new Date(pendente.atualizadoEm).getTime();
      if (passouMs >= noAtual.minutos * 60 * 1000) {
        await avancarFluxo({
          grafo: pendente.grafo,
          flowId: pendente.flowId,
          conta,
          igUserId: remetente,
          noAtualId: pendente.noAtual,
          entrada: { tipo: "tempo_passou" },
        });
      }
      return;
    }

    const proximo =
      noAtual?.tipo === "mensagem"
        ? encontrarProximoPorOpcao(noAtual, texto, payloadBotao)
        : undefined;

    if (proximo !== undefined) {
      // proximo pode ser null (a opção termina o fluxo): o motor encerra.
      await avancarFluxo({
        grafo: pendente.grafo,
        flowId: pendente.flowId,
        conta,
        igUserId: remetente,
        noAtualId: proximo,
        entrada: { tipo: "continuar" },
      });
    } else {
      // Pode ser o e-mail esperado por um bloco "Pedir e-mail", ou uma
      // resposta que não bateu com opção nenhuma (o motor pergunta de novo).
      await avancarFluxo({
        grafo: pendente.grafo,
        flowId: pendente.flowId,
        conta,
        igUserId: remetente,
        noAtualId: pendente.noAtual,
        entrada: { tipo: "texto_livre", texto },
      });
    }
    return;
  }

  // 2) Sem fluxo em andamento: essa mensagem inicia um fluxo ou uma automação?
  const fluxo = await buscarFluxoPorPalavra(conta.id, texto);
  if (fluxo) {
    await query(
      `insert into events (tipo, ig_user_id, payload, account_id)
       values ('dm', $1, $2, $3)`,
      [remetente, JSON.stringify(evento), conta.id]
    );
    await avancarFluxo({
      grafo: fluxo.grafo,
      flowId: fluxo.id,
      conta,
      igUserId: remetente,
      entrada: { tipo: "inicio" },
    });
    return;
  }

  const automacao = await buscarAutomacao(conta.id, texto);
  if (!automacao) return;

  await query(
    `insert into events (tipo, ig_user_id, automation_id, payload, account_id)
     values ('dm', $1, $2, $3, $4)`,
    [remetente, automacao.id, JSON.stringify(evento), conta.id]
  );

  await sendMessage({
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: remetente,
    text: automacao.dm_texto,
    buttonText: automacao.botao_texto ?? undefined,
    buttonUrl: automacao.botao_url ?? undefined,
  }).catch(logErro("Falha ao enviar a DM:"));
}
