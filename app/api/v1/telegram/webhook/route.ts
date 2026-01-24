// Telegram Webhook API
// Receives updates from Telegram Bot API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleWebhookUpdate,
  sendMessage,
  sendWelcomeMessage,
  sendDisconnectedMessage,
} from "@/lib/telegram/bot";
import { TelegramUpdate } from "@/lib/telegram/types";

// Verify webhook secret (optional but recommended)
function verifyWebhook(request: NextRequest): boolean {
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  // If no secret configured, allow all (for development)
  if (!expectedSecret) return true;
  
  return secret === expectedSecret;
}

export async function POST(request: NextRequest) {
  // Verify webhook
  if (!verifyWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    
    // Process update
    const result = await handleWebhookUpdate(update);
    
    if (result) {
      const { action, data } = result;
      
      switch (action) {
        case "connect": {
          // User clicked /start with connection token
          const { chatId, username, token } = data as {
            chatId: string;
            username?: string;
            token: string;
          };
          
          // Find user by token (token is the userId for simplicity)
          // In production, use a temporary token system
          const preferences = await prisma.userPreferences.findFirst({
            where: { userId: token },
            include: { user: true },
          });
          
          if (preferences) {
            // Check if user is Pro
            if (!["ADMIN", "PREMIUM_INVESTOR"].includes(preferences.user.role)) {
              await sendMessage(
                chatId,
                `❌ <b>Telegram notifikácie sú dostupné len pre Pro predplatiteľov.</b>

Upgraduj na Pro plán na sria.sk/pricing a získaj:
🎯 Real-time notifikácie
📊 Pokročilé analýzy
💰 AI investičného poradcu

<a href="${process.env.NEXTAUTH_URL}/pricing">Upgradovať na Pro →</a>`
              );
              break;
            }
            
            // Update user preferences with Telegram info
            await prisma.userPreferences.update({
              where: { id: preferences.id },
              data: {
                telegramChatId: chatId,
                telegramUsername: username || null,
                telegramConnectedAt: new Date(),
                telegramEnabled: true,
              },
            });
            
            // Send welcome message
            await sendWelcomeMessage(chatId, preferences.user.name || undefined);
          } else {
            await sendMessage(
              chatId,
              `❌ <b>Neplatný odkaz na prepojenie.</b>

Prosím, použi odkaz z aplikácie SRIA:
1. Prihlás sa na sria.sk
2. Choď do Nastavenia → Telegram
3. Klikni na "Pripojiť Telegram"`
            );
          }
          break;
        }
        
        case "status_check": {
          const { chatId } = data as { chatId: string };
          
          const preferences = await prisma.userPreferences.findFirst({
            where: { telegramChatId: chatId },
            include: { user: true },
          });
          
          if (preferences) {
            const status = preferences.telegramEnabled ? "✅ Aktívne" : "⏸️ Pozastavené";
            await sendMessage(
              chatId,
              `📊 <b>Stav prepojenia</b>

${status}
👤 Účet: ${preferences.user.email}
📅 Pripojené: ${preferences.telegramConnectedAt?.toLocaleDateString("sk-SK") || "N/A"}

<b>Aktívne notifikácie:</b>
${preferences.notifyMarketGaps ? "✅" : "❌"} Market Gaps
${preferences.notifyPriceDrops ? "✅" : "❌"} Cenové poklesy
${preferences.notifyNewProperties ? "✅" : "❌"} Nové nehnuteľnosti
${preferences.notifyHighYield ? "✅" : "❌"} Vysoký výnos

Zmeniť nastavenia: sria.sk/dashboard/settings`
            );
          } else {
            await sendMessage(
              chatId,
              `❌ Telegram nie je prepojený so žiadnym účtom.

Použi príkaz /start alebo sa prihlás na sria.sk a prejdi do Nastavenia → Telegram.`
            );
          }
          break;
        }
        
        case "settings": {
          const { chatId } = data as { chatId: string };
          
          await sendMessage(
            chatId,
            `⚙️ <b>Nastavenia notifikácií</b>

Pre zmenu nastavení notifikácií navštív:
👉 sria.sk/dashboard/settings

Tam môžeš:
• Zapnúť/vypnúť typy notifikácií
• Nastaviť sledované lokality
• Zmeniť frekvenciu upozornení

<a href="${process.env.NEXTAUTH_URL}/dashboard/settings">Otvoriť nastavenia →</a>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "⚙️ Otvoriť nastavenia",
                      url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
                    },
                  ],
                ],
              },
            }
          );
          break;
        }
        
        case "stop": {
          const { chatId } = data as { chatId: string };
          
          const preferences = await prisma.userPreferences.findFirst({
            where: { telegramChatId: chatId },
          });
          
          if (preferences) {
            await prisma.userPreferences.update({
              where: { id: preferences.id },
              data: { telegramEnabled: false },
            });
            
            await sendMessage(
              chatId,
              `⏸️ <b>Notifikácie pozastavené</b>

Nebudeš dostávať žiadne upozornenia, kým ich znova nezapneš.

Pre obnovenie notifikácií:
• Použi príkaz /start
• Alebo zapni v nastaveniach na sria.sk`
            );
          }
          break;
        }
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// GET for webhook verification
export async function GET() {
  return NextResponse.json({
    status: "Telegram webhook is active",
    bot: "@SRIABot",
  });
}
