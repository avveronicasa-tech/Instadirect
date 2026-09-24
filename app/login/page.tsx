"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.erro || "Senha incorreta.");
        return;
      }
      router.push(params.get("next") || "/");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm p-8"
      >
        <h1 className="text-xl font-semibold mb-1">InstaDirect.</h1>
        <p className="text-sm text-gray-500 mb-6">
          Digite a senha do painel para continuar.
        </p>

        <label className="block text-sm font-medium mb-1" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-purple"
          autoFocus
        />

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

        <button
          type="submit"
          disabled={carregando || !senha}
          className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
