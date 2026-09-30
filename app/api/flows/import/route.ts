import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";
import { grafoVazio, type FlowExport, type FlowFile } from "@/lib/flow-types";

// Aceita 3 formatos: o pacote { formato, fluxos: [...] }, um fluxo único
// { name, trigger, ... nodes, edges }, ou uma lista de fluxos [{...}, {...}].
// Tudo entra pausado (ativo = false) — a pessoa revisa e ativa depois.
export async function POST(req: NextRequest) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json(
      { erro: "Conecte uma conta do Instagram antes de importar fluxos." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ erro: "Arquivo inválido." }, { status: 400 });
  }

  let lista: Partial<FlowExport>[];
  if (body.fluxos) {
    lista = (body as FlowFile).fluxos;
  } else if (Array.isArray(body)) {
    lista = body;
  } else {
    lista = [body];
  }

  if (lista.length === 0) {
    return NextResponse.json({ erro: "Nenhum fluxo encontrado no arquivo." }, { status: 400 });
  }

  const criados = [];
  for (const item of lista) {
    const grafo =
      item.nodes && item.edges
        ? { nodes: item.nodes, edges: item.edges }
        : grafoVazio();

    const [fluxo] = await query(
      `insert into flows
        (nome, descricao, trigger, match_type, keywords, public_replies, grafo, ativo, account_id)
       values ($1, $2, $3, $4, $5, $6, $7, false, $8)
       returning *`,
      [
        item.name || "Fluxo importado",
        item.descricao || null,
        ["comment", "story_reply", "dm"].includes(item.trigger as string)
          ? item.trigger
          : "comment",
        item.match_type === "exact" ? "exact" : "contains",
        Array.isArray(item.keywords) ? item.keywords : [],
        Array.isArray(item.public_replies) ? item.public_replies : [],
        JSON.stringify(grafo),
        conta.id,
      ]
    );
    criados.push(fluxo);
  }

  return NextResponse.json({ ok: true, criados });
}
