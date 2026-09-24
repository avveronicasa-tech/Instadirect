import { Users, Send, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import { isDatabaseConfigured, query, getSetting } from "@/lib/db";

type Evento = {
  tipo: string;
  username: string | null;
  ig_user_id: string;
  created_at: string;
};

function tempoRelativo(data: string): string {
  const diffMs = Date.now() - new Date(data).getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export default async function PainelPage() {
  const dbPronto = await isDatabaseConfigured();

  let username = "sua conta";
  let contaConectada = false;
  let pessoasAlcancadas = 0;
  let automacoesAtivas = 0;
  let eventos: Evento[] = [];

  if (dbPronto) {
    const [usernameSetting, igUserId] = await Promise.all([
      getSetting("ig_username"),
      getSetting("ig_user_id"),
    ]);
    username = usernameSetting || "sua conta";
    contaConectada = Boolean(igUserId);

    const [contagemPessoas] = await query<{ total: string }>(
      "select count(distinct ig_user_id) as total from events"
    );
    pessoasAlcancadas = Number(contagemPessoas?.total || 0);

    const [contagemAutomacoes] = await query<{ total: string }>(
      "select count(*) as total from automations where ativa = true"
    );
    automacoesAtivas = Number(contagemAutomacoes?.total || 0);

    eventos = await query<Evento>(
      "select tipo, username, ig_user_id, created_at from events order by created_at desc limit 7"
    );
  }

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 px-10 py-8 max-w-[1200px]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Painel</h1>
            <p className="text-gray-500 text-sm mt-1">
              Visão geral de @{username}
            </p>
          </div>
          <a
            href="/setup"
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {contaConectada ? "Reconectar" : "Conectar"}
          </a>
        </div>

        {!dbPronto && (
          <div className="card p-4 mb-6 bg-amber-50 border-amber-200 text-sm text-amber-800">
            Banco de dados ainda não configurado. Vá em{" "}
            <strong>Storage → Create Database → Neon</strong> na Vercel e
            reimplante o projeto.
          </div>
        )}

        {/* Card da conta */}
        <div className="card p-5 flex items-center gap-4 mb-6">
          <span className="w-11 h-11 rounded-full bg-brand-purple text-white text-lg font-semibold flex items-center justify-center shrink-0">
            {username.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">@{username}</span>
              <span className="text-xs font-medium bg-[var(--amber-bg)] text-[var(--amber-text)] px-2 py-0.5 rounded-full">
                {automacoesAtivas > 0
                  ? `${automacoesAtivas} automação(ões) ativa(s)`
                  : "Nenhuma automação ativa"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {contaConectada
                ? "Crie uma automação (ou um fluxo) para o robô começar a responder por você."
                : "Conecte sua conta do Instagram em Configuração para começar."}
            </p>
          </div>
          <a
            href="/automacoes"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 whitespace-nowrap"
          >
            Criar automação
          </a>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            titulo="Pessoas alcançadas"
            valor={pessoasAlcancadas}
            legenda="desde o início"
            icon={Users}
            destaque={pessoasAlcancadas > 0}
          />
          <StatCard
            titulo="Mensagens entregues"
            valor={eventos.length}
            legenda="últimos eventos"
            icon={Send}
          />
          <StatCard
            titulo="Automações ativas"
            valor={automacoesAtivas}
            legenda={automacoesAtivas > 0 ? "rodando" : "nenhuma ligada"}
            icon={Zap}
          />
          <StatCard
            titulo="Na fila"
            valor={0}
            legenda="nada pendente"
            icon={AlertTriangle}
          />
        </div>

        {/* Gráfico + interações */}
        <div className="grid grid-cols-[1.1fr_1fr] gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Mensagens por dia</h2>
              <span className="text-xs text-gray-400">últimos 14 dias</span>
            </div>
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">
              Nenhuma mensagem enviada ainda nesse período.
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Últimas interações</h2>
              <a
                href="/atividade"
                className="text-xs font-medium text-brand-purple flex items-center gap-1"
              >
                ver todas <ArrowUpRight size={12} />
              </a>
            </div>
            {eventos.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                Nenhuma interação ainda.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {eventos.map((item, i) => (
                  <li
                    key={i}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium bg-purple-50 text-brand-purple px-2 py-1 rounded-md">
                        {item.tipo === "comentario" ? "Comentou" : "Mandou mensagem"}
                      </span>
                      <span className="text-gray-700">
                        @{item.username || item.ig_user_id}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {tempoRelativo(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
