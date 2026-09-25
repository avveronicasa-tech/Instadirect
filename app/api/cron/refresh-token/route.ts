import { NextResponse } from "next/server";
import { listarContas, query } from "@/lib/db";
import { refreshLongLivedToken } from "@/lib/meta";

export async function GET() {
  const contas = await listarContas();
  const resultados: { username: string | null; ok: boolean; erro?: string }[] = [];

  for (const conta of contas) {
    try {
      const renovado = await refreshLongLivedToken({
        accessToken: conta.access_token,
      });
      await query(
        "update ig_accounts set access_token = $1, token_expira_em = $2 where id = $3",
        [renovado.access_token, Date.now() + renovado.expires_in * 1000, conta.id]
      );
      resultados.push({ username: conta.username, ok: true });
    } catch (e) {
      resultados.push({
        username: conta.username,
        ok: false,
        erro: e instanceof Error ? e.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({ ok: true, contas: resultados });
}
