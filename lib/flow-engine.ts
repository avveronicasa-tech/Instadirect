import { query, type ContaInstagram } from "@/lib/db";
import { sendMessage } from "@/lib/meta";
import {
  proximoPadrao,
  proximoPorBotao,
  type FlowGraph,
  type FlowNode,
} from "@/lib/flow-types";

export type Entrada =
  | { tipo: "iniciar" }
  | { tipo: "continuar" }
  | { tipo: "resposta"; texto: string; payload?: string }
  | { tipo: "tempo_passou" };

function logErro(contexto: string) {
  return (e: unknown) => console.error(contexto, e);
}

function encontrarNo(grafo: FlowGraph, id: string | null): FlowNode | null {
  if (!id) return null;
  return grafo.nodes.find((n) => n.id === id) ?? null;
}

// Roda o fluxo a partir de um bloco, avançando sozinho pelos blocos
// automáticos (etiquetar, esperar já vencido) até parar num bloco que
// precisa de algo da pessoa, ou até acabar o fluxo.
//
// noAtualId: undefined = pegar o próximo depois do "start" | null = fim | "id" = nesse bloco.
export async function avancarFluxo(params: {
  grafo: FlowGraph;
  flowId: number;
  conta: ContaInstagram;
  igUserId: string;
  noAtualId?: string | null;
  entrada: Entrada;
  // Se o fluxo começou por um comentário, a 1ª mensagem sai como resposta
  // privada a esse comentário — só é permitida 1 vez.
  commentId?: string;
}): Promise<void> {
  const { grafo, flowId, conta, igUserId } = params;

  let noId: string | null =
    params.noAtualId !== undefined ? params.noAtualId : proximoPadrao(grafo, "start");
  let entrada = params.entrada;
  let commentId = params.commentId;

  for (let passos = 0; passos < 30; passos++) {
    const no = encontrarNo(grafo, noId);
    if (!no) {
      await encerrarFlowRun(flowId, igUserId);
      return;
    }

    const resultado = await executarNo({ grafo, no, conta, igUserId, entrada, commentId });
    if (resultado.usouComentario) commentId = undefined;

    if (resultado.pararAqui) {
      if (resultado.repetirEnvio === false) return; // ignorou, sem mudar estado
      await salvarFlowRun({ flowId, contaId: conta.id, igUserId, noAtual: no.id });
      return;
    }

    noId = resultado.proximo;
    entrada = { tipo: "continuar" };
  }

  await encerrarFlowRun(flowId, igUserId);
}

async function executarNo(params: {
  grafo: FlowGraph;
  no: FlowNode;
  conta: ContaInstagram;
  igUserId: string;
  entrada: Entrada;
  commentId?: string;
}): Promise<{
  pararAqui: boolean;
  proximo: string | null;
  usouComentario?: boolean;
  repetirEnvio?: boolean;
}> {
  const { grafo, no, conta, igUserId, entrada, commentId } = params;
  const base = {
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: igUserId,
    commentId,
  };

  switch (no.kind) {
    case "start":
      return { pararAqui: false, proximo: proximoPadrao(grafo, "start") };

    case "message": {
      if (no.buttonMode === "reply" && no.buttons.length > 0) {
        if (entrada.tipo === "resposta") {
          const idx = resolverIndiceBotao(no.buttons, entrada);
          if (idx === null) return { pararAqui: true, proximo: null, repetirEnvio: false };
          const alvo = proximoPorBotao(grafo, no.id, idx);
          return { pararAqui: false, proximo: alvo };
        }
        await sendMessage({
          ...base,
          text: no.text,
          quickReplies: no.buttons.map((b, i) => ({ title: b.label, payload: `btn:${i}` })),
        }).catch(logErro("Falha ao enviar mensagem do fluxo:"));
        return { pararAqui: true, proximo: null, usouComentario: true };
      }

      // buttonMode "url" (ou sem botões): manda e segue sozinho.
      const botao = no.buttons[0];
      await sendMessage({
        ...base,
        text: no.text,
        buttonText: botao?.label,
        buttonUrl: botao?.url,
      }).catch(logErro("Falha ao enviar mensagem do fluxo:"));
      return { pararAqui: false, proximo: proximoPadrao(grafo, no.id), usouComentario: true };
    }

    case "follow_gate": {
      if (entrada.tipo === "resposta" || entrada.tipo === "continuar") {
        // Bloco honesto: não verifica nada de verdade, só espera o toque.
        if (entrada.tipo === "resposta") {
          return { pararAqui: false, proximo: proximoPadrao(grafo, no.id) };
        }
      }
      await sendMessage({
        ...base,
        text: no.text,
        quickReplies: [{ title: no.buttonLabel, payload: "ok" }],
      }).catch(logErro("Falha ao enviar o pedido de seguir:"));
      return { pararAqui: true, proximo: null, usouComentario: true };
    }

    case "ask_email": {
      if (entrada.tipo === "resposta" && entrada.texto.includes("@")) {
        await query(
          `insert into contacts (ig_user_id, account_id, email)
           values ($1, $2, $3)
           on conflict (account_id, ig_user_id) do update set email = excluded.email`,
          [igUserId, conta.id, entrada.texto.trim()]
        );
        return { pararAqui: false, proximo: proximoPadrao(grafo, no.id) };
      }
      if (entrada.tipo === "resposta") {
        // Respondeu algo que não parece e-mail: fica esperando, sem reenviar.
        return { pararAqui: true, proximo: null, repetirEnvio: false };
      }
      await sendMessage({ ...base, text: no.text }).catch(
        logErro("Falha ao pedir e-mail:")
      );
      return { pararAqui: true, proximo: null, usouComentario: true };
    }

    case "tag": {
      if (no.tag) {
        await query(
          `insert into contacts (ig_user_id, account_id, tags)
           values ($1, $2, array[$3]::text[])
           on conflict (account_id, ig_user_id)
           do update set tags = array(select distinct unnest(contacts.tags || excluded.tags))`,
          [igUserId, conta.id, no.tag]
        );
      }
      return { pararAqui: false, proximo: proximoPadrao(grafo, no.id) };
    }

    case "delay": {
      if (entrada.tipo === "tempo_passou") {
        return { pararAqui: false, proximo: proximoPadrao(grafo, no.id) };
      }
      return { pararAqui: true, proximo: null };
    }
  }
}

function resolverIndiceBotao(
  buttons: { label: string }[],
  entrada: { texto: string; payload?: string }
): number | null {
  if (entrada.payload?.startsWith("btn:")) {
    const idx = Number(entrada.payload.slice(4));
    if (!Number.isNaN(idx) && buttons[idx]) return idx;
  }
  const texto = entrada.texto.trim().toLowerCase();
  const porNumero = Number(texto) - 1;
  if (buttons[porNumero]) return porNumero;
  const porTexto = buttons.findIndex((b) => b.label.toLowerCase() === texto);
  return porTexto >= 0 ? porTexto : null;
}

async function salvarFlowRun(params: {
  flowId: number;
  contaId: number;
  igUserId: string;
  noAtual: string;
}): Promise<void> {
  await query(
    `insert into flow_runs (flow_id, account_id, ig_user_id, no_atual, atualizado_em)
     values ($1, $2, $3, $4, now())
     on conflict (flow_id, ig_user_id) do update set
       account_id = excluded.account_id,
       atualizado_em = case
         when flow_runs.no_atual = excluded.no_atual then flow_runs.atualizado_em
         else now() end,
       no_atual = excluded.no_atual`,
    [params.flowId, params.contaId, params.igUserId, params.noAtual]
  );
}

async function encerrarFlowRun(flowId: number, igUserId: string): Promise<void> {
  await query("delete from flow_runs where flow_id = $1 and ig_user_id = $2", [
    flowId,
    igUserId,
  ]);
}
