import Sidebar from "@/components/Sidebar";
import { isDatabaseConfigured, query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

type Evento = {
  tipo: string;
  username: string | null;
  ig_user_id: string;
  created_at: string;
};

export default async function AtividadePage() {
  const dbPronto = await isDatabaseConfigured();
  const conta = dbPronto ? await getContaAtiva() : null;

  const eventos = conta
    ? await query<Evento>(
        "select tipo, username, ig_user_id, created_at from events where account_id = $1 order by created_at desc limit 200",
        [conta.id]
      )
    : [];

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <h1 className="text-2xl font-semibold mb-1">Atividade</h1>
        <p className="text-gray-500 text-sm mb-6">
          Todo comentário, resposta de story ou DM que disparou uma automação
          {conta ? ` em @${conta.username}` : ""}.
        </p>

        {eventos.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {eventos.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium bg-purple-50 text-brand-purple px-2 py-1 rounded-md">
                    {e.tipo === "comentario" ? "Comentário" : "DM"}
                  </span>
                  <span>@{e.username || e.ig_user_id}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
