"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { logActivity } from "@/lib/audit";
import { UserRole } from "@/lib/constants";

export async function createUser(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "LECTEUR");
  if (!name || !email || !password) return;
  if (!["ADMIN", "EDITEUR", "LECTEUR"].includes(role)) return;

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: { name, email, passwordHash, role, organizationId: admin.organizationId },
  });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "CREATE",
    entity: "Utilisateur",
    entityId: created.id,
    details: `Création de l'utilisateur ${name} (${email}) — rôle ${role}`,
  });
  revalidatePath("/admin");
}

export async function updateUserRole(userId: string, role: string) {
  await requireRole(["ADMIN"]);
  if (!(["ADMIN", "EDITEUR", "LECTEUR"] as UserRole[]).includes(role as UserRole)) return;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requireRole(["ADMIN"]);
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin");
}

export async function resetUserPassword(userId: string): Promise<string> {
  await requireRole(["ADMIN"]);
  const tempPassword = randomBytes(6).toString("base64url");
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin");
  return tempPassword;
}

export async function deleteUser(userId: string) {
  const admin = await requireRole(["ADMIN"]);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return; // refuse to delete the last admin
  }
  await prisma.user.delete({ where: { id: userId } });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "DELETE",
    entity: "Utilisateur",
    entityId: userId,
    details: `Suppression de l'utilisateur ${target.name} (${target.email})`,
  });
  revalidatePath("/admin");
}
