/**
 * Commission Engine
 * Pri každej úspešnej platbe (Stripe invoice.paid) skontrolovať referredBy,
 * vypočítať 10 % a uložiť do Commission. Volať z Stripe webhooku alebo
 * z POST /api/v1/commission/record.
 */

import { prisma } from "@/lib/prisma";

const DEFAULT_COMMISSION_PCT = 10;

/**
 * Nájde partnera (referredByUserId) pre používateľa, vypočíta províziu (10 % z amountEur)
 * a vytvorí záznam Commission so statusom PENDING.
 */
export async function recordCommission(userId: string, amountEur: number): Promise<void> {
  if (!userId || amountEur <= 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredByUserId: true },
  });
  if (!user?.referredByUserId) return;

  const partner = await prisma.user.findUnique({
    where: { id: user.referredByUserId },
    select: { id: true, role: true },
  });
  if (!partner || partner.role !== "PARTNER") return;

  const amount = Math.round((amountEur * DEFAULT_COMMISSION_PCT) / 100 * 100) / 100;
  if (amount <= 0) return;

  await prisma.commission.create({
    data: {
      amount,
      userId,
      partnerId: partner.id,
      status: "PENDING",
    },
  });
}
