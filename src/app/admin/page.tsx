import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EditableSelect } from "@/components/editable-field";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createUser, updateUserRole, toggleUserActive, resetUserPassword, deleteUser } from "./actions";
import { USER_ROLE_LABELS, UserRole } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AdminPage() {
  const admin = await requireRole(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { createdAt: "asc" },
  });

  const roleAction = async (userId: string, role: string) => {
    "use server";
    await updateUserRole(userId, role);
  };
  const toggleAction = async (userId: string, isActive: boolean) => {
    "use server";
    await toggleUserActive(userId, isActive);
  };
  const resetAction = async (userId: string) => {
    "use server";
    return resetUserPassword(userId);
  };
  const deleteAction = async (userId: string) => {
    "use server";
    await deleteUser(userId);
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-6 py-10 space-y-6">
      <header className="brand-gradient rounded-2xl px-8 py-10 text-white shadow-lg shadow-slate-900/10">
        <Link href="/" className="text-xs font-semibold tracking-wide text-[#FFC933] hover:underline">← Mes projets</Link>
        <p className="text-sm font-semibold tracking-wide text-[#FFC933] mt-2">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h1 className="text-2xl font-bold mt-2">🔐 Administration — Gestion des utilisateurs</h1>
      </header>

      <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Créé le</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-slate-500">{u.email}</td>
                <td className="p-3 w-48">
                  {u.role === "ADMIN" ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      {USER_ROLE_LABELS.ADMIN}
                    </span>
                  ) : (
                    <EditableSelect
                      defaultValue={u.role}
                      action={roleAction.bind(null, u.id)}
                      options={(["EDITEUR", "LECTEUR"] as UserRole[]).map((r) => ({
                        value: r,
                        label: USER_ROLE_LABELS[r],
                      }))}
                    />
                  )}
                </td>
                <td className="p-3">
                  <form action={toggleAction.bind(null, u.id, !u.isActive)}>
                    <button
                      type="submit"
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.isActive ? "Actif" : "Désactivé"}
                    </button>
                  </form>
                </td>
                <td className="p-3 text-slate-400">{formatDate(u.createdAt)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ResetPasswordButton action={resetAction.bind(null, u.id)} />
                    {u.role !== "ADMIN" && (
                      <form action={deleteAction.bind(null, u.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Supprimer l'utilisateur ${u.name} ?`}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Supprimer
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 max-w-lg">
        <h2 className="font-semibold text-slate-700 mb-4">Créer un utilisateur</h2>
        <form action={createUser} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nom *</label>
            <input name="name" required className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Email *</label>
            <input type="email" name="email" required className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Mot de passe initial *</label>
            <input type="text" name="password" required className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Rôle</label>
            <select name="role" defaultValue="LECTEUR" className="cell-input w-full rounded px-3 py-2 text-sm mt-1">
              <option value="EDITEUR">{USER_ROLE_LABELS.EDITEUR}</option>
              <option value="LECTEUR">{USER_ROLE_LABELS.LECTEUR}</option>
            </select>
          </div>
          <button type="submit" className="btn-gold w-full mt-2 rounded-lg text-sm font-semibold py-2.5 transition-all">
            Créer l&apos;utilisateur
          </button>
        </form>
      </section>
    </div>
  );
}
