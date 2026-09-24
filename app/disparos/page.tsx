import Sidebar from "@/components/Sidebar";

export default function DisparosPage() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <h1 className="text-2xl font-semibold mb-1">Disparos</h1>
        <p className="text-gray-500 text-sm mb-6">
          Envio manual de mensagem pra quem já interagiu com você.
        </p>
        <div className="card p-10 text-center text-sm text-gray-400">
          Em construção — próxima etapa depois das Automações.
        </div>
      </main>
    </div>
  );
}
