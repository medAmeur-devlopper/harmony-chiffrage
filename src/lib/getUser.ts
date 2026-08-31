import { requireAuth } from "@/lib/auth";

export async function getCurrentUser() {
  return requireAuth();
}
