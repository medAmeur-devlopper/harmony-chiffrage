"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email ou mot de passe incorrect." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { error: "Email ou mot de passe incorrect." };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "Email ou mot de passe incorrect." };

  await createSession(user.id);
  redirect("/");
}
