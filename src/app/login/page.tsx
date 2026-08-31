import { loginAction } from "./actions";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 overflow-hidden">
        <div className="brand-gradient px-6 py-8 text-center">
          <p className="text-xs font-semibold tracking-wide text-[#FFC933]">HARMONY TECHNOLOGY</p>
          <h1 className="text-xl font-bold text-white mt-1">Outil de chiffrage</h1>
        </div>
        <div className="p-6">
          <LoginForm action={loginAction} />
        </div>
      </div>
    </div>
  );
}
