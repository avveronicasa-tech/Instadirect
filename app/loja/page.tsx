import Sidebar from "@/components/Sidebar";

export default function LojaPage() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-[1000px]">
        <h1 className="text-2xl font-semibold mb-1">Loja</h1>
        <p className="text-gray-500 text-sm mb-6">Em construção.</p>
      </main>
    </div>
  );
}
