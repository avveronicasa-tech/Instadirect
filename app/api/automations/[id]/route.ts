import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

// Campos que podem ser editados. Só o que vier no corpo é atualizado.
const CAMPOS_EDITAVEIS = [
  "nome",
  "palavra_chave",
  "tipo_correspondencia",
  "dm_texto",
  "botao_texto",
  "botao_url",
  "responder_comentario",
  "comentario_texto",
  "ativa",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });
  }

  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const valores: unknown[] = [];
  let i = 1;

  for (const campo of CAMPOS_EDITAVEIS) {
    if (body[campo] === undefined) continue;
    let valor = body[campo];
    if (["botao_texto", "botao_url", "comentario_texto"].includes(campo)) {
      valor = valor || null;
    }
    sets.push(`${campo} = $${i++}`);
    valores.push(valor);
  }

  if (sets.length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  if (body.nome !== undefined && !String(body.nome).trim()) {
    return NextResponse.json({ erro: "O nome não pode ficar vazio." }, { status: 400 });
  }
  if (body.palavra_chave !== undefined && !String(body.palavra_chave).trim()) {
    return NextResponse.json({ erro: "A palavra-chave não pode ficar vazia." }, { status: 400 });
  }
  if (body.dm_texto !== undefined && !String(body.dm_texto).trim()) {
    return NextResponse.json({ erro: "A mensagem de DM não pode ficar vazia." }, { status: 400 });
  }

  valores.push(Number(id), conta.id);
  const [automacao] = await query(
    `update automations set ${sets.join(", ")} where id = $${i++} and account_id = $${i} returning *`,
    valores
  );

  if (!automacao) {
    return NextResponse.json({ erro: "Automação não encontrada." }, { status: 404 });
  }
  return NextResponse.json(automacao);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const conta = await getContaAtiva();
  if (!conta) {
    return NextResponse.json({ erro: "Sem conta ativa." }, { status: 400 });
  }
  const { id } = await params;
  await query("delete from automations where id = $1 and account_id = $2", [
    Number(id),
    conta.id,
  ]);
  return NextResponse.json({ ok: true });
}
