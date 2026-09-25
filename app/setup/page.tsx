"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import CopyField from "@/components/CopyField";
import { CheckCircle2, ExternalLink, Plus, Trash2 } from "lucide-react";

type Conta = { id: number; username: string | null; igUserId: string; ativa: boolean };

export default function SetupPage() {
  const [origin, setOrigin] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregarTudo() {
    const [credenciais, listaContas] = await Promise.all([
      fetch("/api/setup/credentials").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]);
    setAppId(credenciais.appId || "");
    setVerifyToken(credenciais.verifyToken);
    setContas(listaContas);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    carregarTudo();

    const erro = new URLSearchParams(window.location.search).get("erro");
    if (erro) setMensagem(`Erro: ${decodeURIComponent(erro)}`);
  }, []);

  async function salvarCredenciais(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/setup/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, appSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensagem(data.erro || "Não foi possível salvar.");
        return;
      }
      setMensagem(
        "Credenciais salvas. Agora cadastre as URLs abaixo no painel da Meta."
      );
      await carregarTudo();
    } finally {
      setSalvando(false);
    }
  }

  async function tornarAtiva(id: number) {
    await fetch("/api/accounts/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregarTudo();
  }

  async function desconectar(id: number, username: string | null) {
    if (!confirm(`Desconectar @${username || "essa conta"} do InstaDirect?`)) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await carregarTudo();
  }

  const webhookUrl = origin ? `${origin}/api/webhook/instagram` : "";
  const redirectUri = origin ? `${origin}/api/oauth/instagram/callback` : "";

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[860px]">
        <h1 className="text-2xl font-semibold mb-1">Configuração</h1>
        <p className="text-gray-500 text-sm mb-6">
          O app da Meta é configurado uma vez só. Depois, conecte quantas
          contas do Instagram quiser.
        </p>

        {mensagem && (
          <div className="card p-4 mb-6 text-sm text-gray-700">{mensagem}</div>
        )}

        {/* Passo 1 */}
        <section className="card p-6 mb-5">
          <h2 className="font-semibold mb-1">1. Crie o app na Meta (uma vez só)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Abra{" "}
            <a
              href="https://developers.facebook.com/apps/creation/"
              target="_blank"
              className="text-brand-purple underline inline-flex items-center gap-1"
            >
              developers.facebook.com/apps/creation <ExternalLink size={12} />
            </a>{" "}
            e escolha o caso de uso <strong>“Gerencie mensagens e conteúdo no Instagram”</strong>.
            Copie o <strong>ID do app</strong> e a <strong>chave secreta</strong> e cole abaixo.
          </p>

          <form onSubmit={salvarCredenciais} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                ID do app do Instagram
              </label>
              <input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="000000000000000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Chave secreta
              </label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="••••••••••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={salvando || !appId || !appSecret}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar credenciais"}
            </button>
          </form>
        </section>

        {/* Passo 2 */}
        <section className="card p-6 mb-5">
          <h2 className="font-semibold mb-1">2. Cadastre as URLs no painel da Meta</h2>
          <p className="text-sm text-gray-500 mb-4">
            Em <strong>Webhooks</strong>, cole a URL de callback e o token de
            verificação. Em <strong>Configurar login da empresa</strong>, cole o URI
            de redirecionamento. Assine os campos <code>comments</code> e{" "}
            <code>messages</code>.
          </p>
          <div className="space-y-3">
            <CopyField label="URL de callback do webhook" value={webhookUrl} />
            <CopyField label="Token de verificação" value={verifyToken || ""} />
            <CopyField label="URI de redirecionamento OAuth" value={redirectUri} />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Não esqueça de colocar o app em <strong>Ao vivo</strong> — em modo
            desenvolvimento o webhook não entrega eventos.
          </p>
        </section>

        {/* Passo 3 — contas */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">3. Contas conectadas</h2>
            <a
              href="/api/oauth/instagram/authorize"
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
                appId
                  ? "bg-brand-purple text-white hover:opacity-90"
                  : "bg-gray-200 text-gray-400 pointer-events-none"
              }`}
            >
              <Plus size={14} /> Conectar nova conta
            </a>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Pra conectar outra conta, faça login nela no Instagram desse
            mesmo dispositivo/navegador e clique em “Conectar nova conta”.
            Ela é adicionada à lista, sem remover as demais.
          </p>

          {contas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Nenhuma conta conectada ainda.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {contas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-2">
                    {c.ativa && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                    <span className="text-sm font-medium">
                      @{c.username || c.igUserId}
                    </span>
                    {c.ativa && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        ativa no painel
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!c.ativa && (
                      <button
                        onClick={() => tornarAtiva(c.id)}
                        className="text-xs font-medium text-brand-purple hover:underline"
                      >
                        Usar essa conta
                      </button>
                    )}
                    <button
                      onClick={() => desconectar(c.id, c.username)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title="Desconectar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
