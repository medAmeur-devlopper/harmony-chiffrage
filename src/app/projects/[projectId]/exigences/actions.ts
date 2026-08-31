"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Complexity, DEFAULT_COMPLEXITY_CHARGE } from "@/lib/constants";

export async function addRequirement(projectId: string, versionId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.requirement.count({ where: { projectVersionId: versionId } });
  await prisma.requirement.create({
    data: {
      projectVersionId: versionId,
      refId: `REQ-${count + 1}`,
      epicName: "",
      title: "",
      complexity: "FAIBLE",
      chargeAbaque: DEFAULT_COMPLEXITY_CHARGE.FAIBLE,
      chargeRetenue: DEFAULT_COMPLEXITY_CHARGE.FAIBLE,
      orderNum: count,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteRequirement(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.requirement.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}

const TEXT_FIELDS = ["refId", "epicName", "moduleName", "title", "description"] as const;
const BOOL_FIELDS = ["optional", "requiresHardware", "retained"] as const;
const ENUM_FIELDS = ["complexity", "moscow", "coverage"] as const;
const NUM_FIELDS = ["chargeRetenue", "chargeIoT"] as const;

export async function updateRequirementField(
  id: string,
  projectId: string,
  field: string,
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if ((TEXT_FIELDS as readonly string[]).includes(field)) {
    await prisma.requirement.update({ where: { id }, data: { [field]: value } });
  } else if ((BOOL_FIELDS as readonly string[]).includes(field)) {
    await prisma.requirement.update({ where: { id }, data: { [field]: value === "true" } });
  } else if (field === "complexity") {
    const chargeAbaque = DEFAULT_COMPLEXITY_CHARGE[value as Complexity] ?? 0;
    await prisma.requirement.update({
      where: { id },
      data: { complexity: value, chargeAbaque, chargeRetenue: chargeAbaque },
    });
  } else if ((ENUM_FIELDS as readonly string[]).includes(field)) {
    await prisma.requirement.update({ where: { id }, data: { [field]: value } });
  } else if ((NUM_FIELDS as readonly string[]).includes(field)) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    await prisma.requirement.update({ where: { id }, data: { [field]: num } });
  }
  revalidatePath(`/projects/${projectId}`);
}
