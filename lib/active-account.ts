import { cookies } from "next/headers";
import { listarContas, type ContaInstagram } from "@/lib/db";

export const CONTA_ATIVA_COOKIE = "conta_ativa_id";

export async function getContaAtiva(): Promise<ContaInstagram | null> {
  const contas = await listarContas();
  if (contas.length === 0) return null;

  const cookieStore = await cookies();
  const idSelecionado = cookieStore.get(CONTA_ATIVA_COOKIE)?.value;

  const encontrada = contas.find((c) => String(c.id) === idSelecionado);
  return encontrada ?? contas[0];
}
