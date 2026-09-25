import Sidebar from "@/components/Sidebar";
import { isDatabaseConfigured, query } from "@/lib/db";
import { getContaAtiva } from "@/lib/active-account";

type Contato = {
  username: string | null;
  ig_user_id: string;
  tags: string[];
  created_at: string;
};

export default async function ContatosPage() {
  const dbPronto = await isDatabaseConfigured();
  const conta = dbPronto ? await getContaAtiva() : null;

  const contatos = conta
    ? await query<Contato>(
        "select username, ig_user_id, tags, created_at from contacts where account_id = $1 order by created_at desc limit 100",
        [conta.id]
      )
    : [];

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <h1 className="text-2xl font-semibold mb-1">Contatos</h1>
        <p className="text-gray-500 text-sm mb-6">
          Pessoas que já comentaram, responderam story ou mandaram DM
          {conta ? ` para @${conta.username}` : ""}.
        </p>

        {contatos.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">
            Nenhum contato ainda.
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {contatos.map((c) => (
              <div
                key={c.ig_user_id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span>@{c.username || c.ig_user_id}</span>
                <div className="flex gap-1">
                  {c.tags?.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-purple-50 text-brand-purple px-2 py-0.5 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
