import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-400 to-red-600 text-2xl shadow-md">
          🚫
        </div>
        <h1 className="text-lg font-bold text-slate-800">Accès refusé</h1>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          Votre rôle ne vous permet pas d&apos;accéder à cette page.
        </p>
        <Link href="/" className="text-sm font-medium text-[#2f6f8f] hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
