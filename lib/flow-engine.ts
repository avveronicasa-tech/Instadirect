import { query, type ContaInstagram } from "@/lib/db";
import { sendMessage } from "@/lib/meta";
import type { FlowGraph, FlowNode } from "@/lib/flow-types";

export type EntradaFluxo =
  | { tipo: "inicio" }
  | { tipo: "continuar" } // chegou aqui avançando sozinho do bloco anterior
  | { tipo: "texto_livre"; texto: string }
  | { tipo: "tempo_passou" };

function logErro(contexto: string) {
  return (e: unknown) => console.error(contexto, e);
}

// Roda o fluxo a partir de um nó, avançando sozinho por blocos automáticos
// até parar num bloco que precisa de algo da pessoa (opção tocada, e-mail,
// tempo passar) ou até acabar o fluxo.
//
// noAtualId: undefined = começar do início | null = fim do fluxo | "id" = nesse bloco.
export async function avancarFluxo(params: {
  grafo: FlowGraph;
  flowId: number;
  conta: ContaInstagram;
  igUserId: string;
  noAtualId?: string | null;
  entrada: EntradaFluxo;
  // Se o fluxo começou por um comentário, a 1ª mensagem sai como resposta
  // privada a esse comentário (só dá pra mandar uma).
  commentId?: string;
}): Promise<void> {
  const { grafo, flowId, conta, igUserId } = params;
  let noId: string | null =
    params.noAtualId === undefined ? grafo.inicio : params.noAtualId;
  let entrada = params.entrada;
  let commentId = params.commentId;

  // Limite de segurança pra nunca travar num loop infinito.
  for (let passos = 0; passos < 25; passos++) {
    if (!noId) {
      await encerrarFlowRun(flowId, igUserId);
      return;
    }
    const no = grafo.nos[noId];
    if (!no) {
      await encerrarFlowRun(flowId, igUserId);
      return;
    }

    const resultado = await executarNo({ no, conta, igUserId, entrada, commentId });
    if (resultado.usouComentario) commentId = undefined;

    if (resultado.pararAqui) {
      await salvarFlowRun({ flowId, contaId: conta.id, igUserId, noAtual: no.id });
      return;
    }

    noId = resultado.proximo;
    entrada = { tipo: "continuar" };
  }

  await encerrarFlowRun(flowId, igUserId);
}

async function executarNo(params: {
  no: FlowNode;
  conta: ContaInstagram;
  igUserId: string;
  entrada: EntradaFluxo;
  commentId?: string;
}): Promise<{ pararAqui: boolean; proximo: string | null; usouComentario?: boolean }> {
  const { no, conta, igUserId, entrada, commentId } = params;
  const base = {
    accessToken: conta.access_token,
    igUserId: conta.ig_user_id,
    recipientId: igUserId,
    commentId,
  };

  switch (no.tipo) {
    case "mensagem": {
      if (no.opcoes.length > 0) {
        await sendMessage({
          ...base,
          text: no.texto,
          quickReplies: no.opcoes.map((o) => ({ title: o.texto, payload: o.id })),
        }).catch(logErro("Falha ao enviar mensagem do fluxo:"));
        // Para aqui até a pessoa tocar numa opção (o toque volta pelo webhook).
        return { pararAqui: true, proximo: null, usouComentario: true };
      }
      await sendMessage({
        ...base,
        text: no.texto,
        buttonText: no.botaoTexto,
        buttonUrl: no.botaoUrl,
      }).catch(logErro("Falha ao enviar mensagem do fluxo:"));
      return { pararAqui: false, proximo: no.proximo, usouComentario: true };
    }

    case "esperar": {
      // Só segue quando o tempo realmente passou (cron ou próxima mensagem).
      if (entrada.tipo === "tempo_passou") {
        return { pararAqui: false, proximo: no.proximo };
      }
      return { pararAqui: true, proximo: null };
    }

    case "pedir_email": {
      if (entrada.tipo === "texto_livre" && entrada.texto.includes("@")) {
        await query(
          `insert into contacts (ig_user_id, account_id, email)
           values ($1, $2, $3)
           on conflict (account_id, ig_user_id) do update set email = excluded.email`,
          [igUserId, conta.id, entrada.texto.trim()]
        );
        return { pararAqui: false, proximo: no.proximo };
      }
      await sendMessage({ ...base, text: no.texto }).catch(
        logErro("Falha ao pedir e-mail:")
      );
      return { pararAqui: true, proximo: null, usouComentario: true };
    }

    case "etiquetar": {
      await query(
        `insert into contacts (ig_user_id, account_id, tags)
         values ($1, $2, array[$3]::text[])
         on conflict (account_id, ig_user_id)
         do update set tags = array(select distinct unnest(contacts.tags || excluded.tags))`,
        [igUserId, conta.id, no.etiqueta]
      );
      return { pararAqui: false, proximo: no.proximo };
    }
  }
}

// Descobre pra onde ir depois que a pessoa respondeu um bloco de mensagem
// com opções. Retorna: string = id do próximo bloco | null = fim do fluxo |
// undefined = a resposta não bateu com nenhuma opção.
export function encontrarProximoPorOpcao(
  no: FlowNode,
  entradaTexto: string,
  payloadBotao?: string
): string | null | undefined {
  if (no.tipo !== "mensagem" || no.opcoes.length === 0) return undefined;

  // Caminho certo: a pessoa tocou no botão, o payload é o id da opção.
  if (payloadBotao) {
    const porPayload = no.opcoes.find((o) => o.id === payloadBotao);
    if (porPayload) return porPayload.proximo;
  }

  // Reserva: a pessoa digitou o número ou o texto do botão.
  const texto = entradaTexto.trim().toLowerCase();
  const porNumero = no.opcoes[Number(texto) - 1];
  if (porNumero) return porNumero.proximo;
  const porTexto = no.opcoes.find((o) => o.texto.toLowerCase() === texto);
  return porTexto ? porTexto.proximo : undefined;
}

async function salvarFlowRun(params: {
  flowId: number;
  contaId: number;
  igUserId: string;
  noAtual: string;
}): Promise<void> {
  // Se a pessoa continua parada no mesmo bloco, não reinicia o relógio
  // (senão o "Esperar" nunca terminaria).
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
