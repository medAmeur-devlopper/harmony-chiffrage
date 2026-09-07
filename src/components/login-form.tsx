"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-xs font-medium text-slate-500">Email</label>
        <input
          type="email"
          name="email"
          required
          autoFocus
          className="cell-input w-full rounded px-3 py-2 text-sm mt-1"
          placeholder="prenom.nom@harmony.ma"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Mot de passe</label>
        <input
          type="password"
          name="password"
          required
          className="cell-input w-full rounded px-3 py-2 text-sm mt-1"
        />
      </div>
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full mt-2">
        {isPending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
