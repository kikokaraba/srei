/**
 * Cron Job - Cleanup neaktívnych inzerátov
 * TODO: Aktivovať po migrácii databázy (pridať last_seen_at a status polia)
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Dočasne deaktivované - čaká na migráciu databázy
  return NextResponse.json({
    success: true,
    message: "Cleanup dočasne deaktivovaný - čaká na migráciu DB",
    summary: { staleFound: 0, expired: 0, archived: 0 },
  });
}

export const runtime = "nodejs";
export const maxDuration = 60;
