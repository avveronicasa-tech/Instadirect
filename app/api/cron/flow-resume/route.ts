import { NextResponse } from "next/server";
import { query, type ContaInstagram } from "@/lib/db";
import { avancarFluxo } from "@/lib/flow-engine";
import type { FlowGraph } from "@/lib/flow-types";

type LinhaPendente = {
  flow_id: number;
  ig_user_id: string;
  no_atual: string;
  atualizado_em: string;
  grafo: FlowGraph;
  account_id: number;
};

export async function GET() {
  const pendentes = await query<LinhaPendente>(
    `select fr.flow_id, fr.ig_user_id, fr.no_atual, fr.atualizado_em, fr.account_id, f.grafo
     from flow_runs fr
     join flows f on f.id = fr.flow_id`
  );

  let resolvidos = 0;

  for (const p of pendentes) {
    const no = p.grafo.nodes.find((n) => n.id === p.no_atual);
    if (!no || no.kind !== "delay") continue;

    const passouMs = Date.now() - new Date(p.atualizado_em).getTime();
    if (passouMs < no.minutes * 60 * 1000) continue;

    const [conta] = await query<ContaInstagram>(
      "select * from ig_accounts where id = $1",
      [p.account_id]
    );
    if (!conta) continue;

    await avancarFluxo({
      grafo: p.grafo,
      flowId: p.flow_id,
      conta,
      igUserId: p.ig_user_id,
      noAtualId: p.no_atual,
      entrada: { tipo: "tempo_passou" },
    });
    resolvidos++;
  }

  return NextResponse.json({ ok: true, resolvidos });
}
