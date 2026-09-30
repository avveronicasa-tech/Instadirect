import { NextRequest, NextResponse } from "next/server";
import { getFluxo, query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });

  const { id } = await params;
  const original = await getFluxo(Number(id), conta.id);
  if (!original) {
    return NextResponse.json({ erro: "Fluxo não encontrado." }, { status: 404 });
  }

  const [copia] = await query(
    `insert into flows (nome, descricao, trigger, match_type, keywords, public_replies, grafo, ativo, account_id)
     values ($1, $2, $3, $4, $5, $6, $7, false, $8)
     returning *`,
    [
      `${original.nome} (cópia)`,
      original.descricao,
      original.trigger,
      original.match_type,
      original.keywords,
      original.public_replies,
      JSON.stringify(original.grafo),
      conta.id,
    ]
  );

  return NextResponse.json(copia, { status: 201 });
}
