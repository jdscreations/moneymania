import { consentPurposes, type ConsentDto, type ConsentPurpose } from "@moneymania/core";
import { prisma } from "@moneymania/db";

/** The user's current consents. Each grant and withdrawal is kept as a record. */
export async function consentsFor(userId: string): Promise<ConsentDto[]> {
  const active = await prisma.consent.findMany({ where: { userId, withdrawnAt: null } });
  return consentPurposes.map((purpose) => {
    const c = active.find((a) => a.purpose === purpose);
    return { purpose, granted: !!c, grantedAt: c ? c.grantedAt.toISOString() : null };
  });
}

export async function setConsent(userId: string, purpose: ConsentPurpose, granted: boolean) {
  const active = await prisma.consent.findFirst({ where: { userId, purpose, withdrawnAt: null } });
  if (granted && !active) await prisma.consent.create({ data: { userId, purpose } });
  if (!granted && active) await prisma.consent.update({ where: { id: active.id }, data: { withdrawnAt: new Date() } });
}
