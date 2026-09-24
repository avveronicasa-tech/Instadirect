"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import CopyField from "@/components/CopyField";
import { CheckCircle2, ExternalLink } from "lucide-react";

export default function SetupPage() {
  const [origin, setOrigin] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [contaConectada, setContaConectada] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/setup/credentials")
      .then((r) => r.json())
      .then((data) => {
        setAppId(data.appId || "");
        setVerifyToken(data.verifyToken);
        setContaConectada(data.contaConectada);
        setUsername(data.username);
      });

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
      setMensagem("Credenciais salvas. Agora cadastre as URLs abaixo no painel da Meta.");
      const check = await fetch("/api/setup/credentials").then((r) => r.json());
      setVerifyToken(check.verifyToken);
    } finally {
      setSalvando(false);
    }
  }

  const webhookUrl = origin ? `${origin}/api/webhook/instagram` : "";
  const redirectUri = origin ? `${origin}/api/oauth/instagram/callback` : "";

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[860px]">
        <h1 className="text-2xl font-semibold mb-1">Configuração</h1>
        <p className="text-gray-500 text-sm mb-6">
          Conecte o app do Instagram em 3 passos.
        </p>

        {contaConectada && (
          <div className="card p-4 mb-6 flex items-center gap-3 bg-emerald-50 border-emerald-200">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              Conta <strong>@{username}</strong> já está conectada.
            </p>
          </div>
        )}

        {mensagem && (
          <div className="card p-4 mb-6 text-sm text-gray-700">{mensagem}</div>
        )}

        {/* Passo 1 */}
        <section className="card p-6 mb-5">
          <h2 className="font-semibold mb-1">1. Crie o app na Meta</h2>
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
            Depois copie o <strong>ID do app do Instagram</strong> e a{" "}
            <strong>chave secreta</strong> nas configurações do app e cole abaixo.
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

        {/* Passo 3 */}
        <section className="card p-6">
          <h2 className="font-semibold mb-1">3. Conecte sua conta</h2>
          <p className="text-sm text-gray-500 mb-4">
            Adicione sua conta como Testador do Instagram nas Funções do app,
            aceite o convite no celular e clique no botão abaixo.
          </p>
          <a
            href="/api/oauth/instagram/authorize"
            className={`inline-block px-4 py-2 text-sm font-medium rounded-lg ${
              appId
                ? "bg-brand-purple text-white hover:opacity-90"
                : "bg-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            Conectar Instagram
          </a>
        </section>
      </main>
    </div>
  );
}
