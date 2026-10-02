"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Braces, Search, Send } from "lucide-react";

type Contato = {
  igUserId: string;
  username: string | null;
  horasRestantes: number;
  expirado: boolean;
};

function formatarJanela(horas: number, expirado: boolean): string {
  if (expirado) return "expirado";
  if (horas < 1) return `${Math.round(horas * 60)}min`;
  return `${Math.round(horas)}h`;
}

export default function DisparosPage() {
  const [texto, setTexto] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoUrl, setBotaoUrl] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/disparos/contacts")
      .then((r) => r.json())
      .then(setContatos)
      .finally(() => setCarregando(false));
  }, []);

  const contatosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const lista = contatos.filter((c) => !c.expirado);
    if (!b) return lista;
    return lista.filter(
      (c) =>
        c.username?.toLowerCase().includes(b) || c.igUserId.toLowerCase().includes(b)
    );
  }, [contatos, busca]);

  function inserirVariavel() {
    const campo = textareaRef.current;
    if (!campo) return;
    const pos = campo.selectionStart ?? texto.length;
    const novo = texto.slice(0, pos) + "{{first_name}}" + texto.slice(pos);
    setTexto(novo);
    requestAnimationFrame(() => campo.focus());
  }

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function marcarTodos() {
    setSelecionados((prev) =>
      prev.size === contatosFiltrados.length
        ? new Set()
        : new Set(contatosFiltrados.map((c) => c.igUserId))
    );
  }

  async function enviar() {
    if (!texto.trim() || selecionados.size === 0) return;
    if (!confirm(`Mandar essa mensagem pra ${selecionados.size} pessoa(s)?`)) return;

    setEnviando(true);
    setResultado(null);
    const res = await fetch("/api/disparos/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto,
        botaoTexto: botaoTexto || undefined,
        botaoUrl: botaoUrl || undefined,
        destinatarios: Array.from(selecionados),
      }),
    });
    const data = await res.json();
    setEnviando(false);

    if (!res.ok) {
      setResultado(data.erro || "Não foi possível enviar.");
      return;
    }
    setResultado(
      `Enviado pra ${data.enviados} pessoa(s).` +
        (data.expirados > 0 ? ` ${data.expirados} fora da janela de 24h, não recebeu.` : "") +
        (data.falhas?.length > 0 ? ` Falhou pra: ${data.falhas.join(", ")}.` : "")
    );
    setSelecionados(new Set());
  }

  const previewTexto = texto.replace(/\{\{first_name\}\}/g, "Ana");

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <h1 className="text-2xl font-semibold mb-1">Disparos</h1>
        <p className="text-gray-500 text-sm mb-6">
          Envio manual de mensagem pra quem já interagiu com você (só funciona
          dentro da janela de 24h da Meta).
        </p>

        {/* 1. A mensagem */}
        <section className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">1. A mensagem</h2>
            <button
              onClick={inserirVariavel}
              className="flex items-center gap-1 text-xs text-brand-purple hover:underline"
            >
              <Braces size={13} /> Variáveis
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Oi {{first_name}}! Separei uma novidade que combina com o que você pediu 👇"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Vale para quem já falou com você nas últimas 24h. Escreva como se
            fosse uma conversa — é isso que ela é.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Link do botão (opcional)
              </label>
              <input
                value={botaoUrl}
                onChange={(e) => setBotaoUrl(e.target.value)}
                placeholder="https://seulink.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Texto do botão
              </label>
              <input
                value={botaoTexto}
                onChange={(e) => setBotaoTexto(e.target.value)}
                placeholder="Abrir link"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Prévia</p>
          <div className="bg-gray-900 rounded-xl px-4 py-3">
            <p className="text-white text-sm">
              {previewTexto || <span className="text-gray-500 italic">Sua mensagem...</span>}
            </p>
            {botaoTexto && (
              <span className="inline-block mt-2 text-xs text-blue-400 underline">
                {botaoTexto}
              </span>
            )}
          </div>
        </section>

        {/* 2. Para quem */}
        <section className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">2. Para quem</h2>
            <span className="text-xs text-gray-400">
              {selecionados.size} de {contatosFiltrados.length} selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou @..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={marcarTodos}
              className="px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Marcar todos
            </button>
          </div>

          {carregando ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : contatosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum contato dentro da janela de 24h no momento.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {contatosFiltrados.map((c) => (
                <label
                  key={c.igUserId}
                  className="flex items-center justify-between py-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selecionados.has(c.igUserId)}
                      onChange={() => alternarSelecao(c.igUserId)}
                    />
                    <span className="w-7 h-7 rounded-full bg-brand-purple text-white text-xs font-semibold flex items-center justify-center">
                      {(c.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm">@{c.username || c.igUserId}</span>
                  </div>
                  <span
                    className={`text-xs ${
                      c.horasRestantes < 3 ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {formatarJanela(c.horasRestantes, c.expirado)}
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            A coluna da direita mostra quanto falta pra janela de cada pessoa
            fechar.
          </p>
        </section>

        {resultado && <div className="card p-4 mb-5 text-sm">{resultado}</div>}

        <button
          onClick={enviar}
          disabled={enviando || !texto.trim() || selecionados.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
        >
          <Send size={15} />
          {enviando ? "Enviando..." : `Enviar pra ${selecionados.size} pessoa(s)`}
        </button>
      </main>
    </div>
  );
}
