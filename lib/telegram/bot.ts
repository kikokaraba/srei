// Telegram Bot Integration for SRIA
// Pro feature: Real-time notifications for investors

import {
  TelegramUpdate,
  TelegramMessage,
  SendMessageOptions,
  PropertyNotification,
  DailySummaryNotification,
  TelegramInlineKeyboard,
} from "./types";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}

function getApiUrl(method: string): string {
  return `${TELEGRAM_API_URL}${getBotToken()}/${method}`;
}

// ============================================
// Core API Methods
// ============================================

export async function sendMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {}
): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || "HTML",
        disable_web_page_preview: options.disable_web_page_preview ?? false,
        disable_notification: options.disable_notification ?? false,
        reply_markup: options.reply_markup,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error("Telegram sendMessage error:", result);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl("answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Failed to answer callback query:", error);
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl("setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error("Failed to set webhook:", result);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to set webhook:", error);
    return false;
  }
}

export async function getWebhookInfo(): Promise<unknown> {
  try {
    const response = await fetch(getApiUrl("getWebhookInfo"));
    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error("Failed to get webhook info:", error);
    return null;
  }
}

// ============================================
// Message Formatting
// ============================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getNotificationEmoji(type: PropertyNotification["type"]): string {
  switch (type) {
    case "market_gap":
      return "🎯";
    case "price_drop":
      return "📉";
    case "hot_deal":
      return "🔥";
    case "high_yield":
      return "💰";
    case "distressed":
      return "⚠️";
    case "new_property":
      return "🆕";
    case "urban_development":
      return "🏗️";
    default:
      return "📢";
  }
}

function getNotificationTitle(type: PropertyNotification["type"]): string {
  switch (type) {
    case "market_gap":
      return "Market Gap nájdený!";
    case "price_drop":
      return "Cena klesla!";
    case "hot_deal":
      return "Hot Deal!";
    case "high_yield":
      return "Vysoký výnos!";
    case "distressed":
      return "Nehnuteľnosť v núdzi!";
    case "new_property":
      return "Nová nehnuteľnosť";
    case "urban_development":
      return "Nový development projekt";
    default:
      return "Upozornenie";
  }
}

// ============================================
// Notification Builders
// ============================================

export function buildPropertyNotificationMessage(
  notification: PropertyNotification
): { text: string; buttons: TelegramInlineKeyboard[][] } {
  const emoji = getNotificationEmoji(notification.type);
  const title = getNotificationTitle(notification.type);
  
  let text = `${emoji} <b>${title}</b>\n\n`;
  text += `📍 <b>${notification.city}</b>`;
  if (notification.district) {
    text += ` - ${notification.district}`;
  }
  text += "\n\n";
  
  text += `🏠 ${notification.title}\n`;
  text += `💵 <b>${formatPrice(notification.price)}</b>`;
  
  if (notification.pricePerM2) {
    text += ` (${formatPrice(notification.pricePerM2)}/m²)`;
  }
  text += "\n";
  
  if (notification.area) {
    text += `📐 ${notification.area} m²`;
    if (notification.rooms) {
      text += ` • ${notification.rooms} izby`;
    }
    text += "\n";
  }
  
  // Type-specific info
  if (notification.type === "market_gap" && notification.gapPercent) {
    text += `\n🎯 <b>Podhodnotenie: ${notification.gapPercent.toFixed(1)}%</b>`;
    if (notification.fairValue) {
      text += `\n💎 Fair Value: ${formatPrice(notification.fairValue)}`;
    }
  }
  
  if (notification.type === "price_drop" && notification.priceDropPercent) {
    text += `\n📉 <b>Pokles: ${formatPercent(-notification.priceDropPercent)}</b>`;
    if (notification.oldPrice) {
      text += `\n💸 Pôvodná cena: ${formatPrice(notification.oldPrice)}`;
    }
  }
  
  if (notification.type === "high_yield" && notification.yield) {
    text += `\n💰 <b>Výnos: ${notification.yield.toFixed(1)}%</b>`;
  }
  
  // Buttons
  const buttons: TelegramInlineKeyboard[][] = [];
  
  const row1: TelegramInlineKeyboard[] = [];
  
  if (notification.siteUrl) {
    row1.push({
      text: "🔗 Zobraziť v SRIA",
      url: notification.siteUrl,
    });
  }
  
  if (notification.sourceUrl) {
    row1.push({
      text: "🌐 Originál inzerát",
      url: notification.sourceUrl,
    });
  }
  
  if (row1.length > 0) {
    buttons.push(row1);
  }
  
  return { text, buttons };
}

export function buildDailySummaryMessage(
  summary: DailySummaryNotification
): { text: string; buttons: TelegramInlineKeyboard[][] } {
  const dateStr = summary.date.toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  
  let text = `📊 <b>Denný prehľad SRIA</b>\n`;
  text += `📅 ${dateStr}\n\n`;
  
  text += `📦 Nové nehnuteľnosti: <b>${summary.newProperties}</b>\n`;
  text += `🎯 Market Gaps: <b>${summary.marketGaps}</b>\n`;
  text += `📉 Cenové poklesy: <b>${summary.priceDrops}</b>\n`;
  text += `🔥 Hot Deals: <b>${summary.hotDeals}</b>\n`;
  
  if (summary.topDeals.length > 0) {
    text += "\n<b>🏆 Top príležitosti dňa:</b>\n\n";
    
    for (const deal of summary.topDeals.slice(0, 3)) {
      const emoji = getNotificationEmoji(deal.type);
      text += `${emoji} ${deal.city}: ${deal.title}\n`;
      text += `   ${formatPrice(deal.price)}`;
      if (deal.gapPercent) {
        text += ` (-${deal.gapPercent.toFixed(0)}%)`;
      }
      text += "\n\n";
    }
  }
  
  const buttons: TelegramInlineKeyboard[][] = [
    [
      {
        text: "📱 Otvoriť SRIA Dashboard",
        url: `${process.env.NEXTAUTH_URL || "https://sria.sk"}/dashboard`,
      },
    ],
  ];
  
  return { text, buttons };
}

// ============================================
// Command Handlers
// ============================================

export async function handleCommand(
  message: TelegramMessage
): Promise<string | null> {
  const text = message.text || "";
  const chatId = message.chat.id.toString();
  
  if (text.startsWith("/start")) {
    // Extract token if present (for account linking)
    const parts = text.split(" ");
    const token = parts[1];
    
    if (token) {
      return `connect:${token}`;
    }
    
    return `👋 <b>Vitaj v SRIA Bot!</b>

Tento bot ti pošle notifikácie o:
🎯 Market Gaps (podhodnotené nehnuteľnosti)
📉 Cenových poklesoch
🔥 Hot Deals
💰 Vysokých výnosoch

<b>Ako začať:</b>
1. Prihlás sa na sria.sk
2. Choď do Nastavenia → Telegram
3. Klikni na "Pripojiť Telegram"

Tvoje Chat ID: <code>${chatId}</code>

ℹ️ Telegram notifikácie sú dostupné pre <b>Pro predplatiteľov</b>.`;
  }
  
  if (text === "/help") {
    return `📚 <b>SRIA Bot - Pomocník</b>

<b>Dostupné príkazy:</b>
/start - Začať a pripojiť účet
/status - Stav prepojenia
/settings - Nastavenia notifikácií
/stop - Zastaviť notifikácie
/help - Táto správa

<b>Typy notifikácií:</b>
🎯 Market Gap - Nehnuteľnosť pod trhovou cenou
📉 Price Drop - Zníženie ceny
🔥 Hot Deal - Výhodná ponuka
💰 High Yield - Vysoký výnos z prenájmu
⚠️ Distressed - Nehnuteľnosť v núdzi
🏗️ Urban Dev - Nové projekty v okolí

Máš otázky? Napíš na support@sria.sk`;
  }
  
  if (text === "/status") {
    return `status_check:${chatId}`;
  }
  
  if (text === "/settings") {
    return `settings:${chatId}`;
  }
  
  if (text === "/stop") {
    return `stop:${chatId}`;
  }
  
  return null;
}

// ============================================
// Webhook Handler
// ============================================

export async function handleWebhookUpdate(
  update: TelegramUpdate
): Promise<{ action: string; data: Record<string, unknown> } | null> {
  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id.toString();
    const username = message.from?.username;
    
    // Handle commands
    if (message.text?.startsWith("/")) {
      const result = await handleCommand(message);
      
      if (result) {
        // Check if it's an action or a message
        if (result.startsWith("connect:")) {
          return {
            action: "connect",
            data: {
              chatId,
              username,
              token: result.replace("connect:", ""),
            },
          };
        }
        
        if (result.startsWith("status_check:")) {
          return {
            action: "status_check",
            data: { chatId, username },
          };
        }
        
        if (result.startsWith("settings:")) {
          return {
            action: "settings",
            data: { chatId, username },
          };
        }
        
        if (result.startsWith("stop:")) {
          return {
            action: "stop",
            data: { chatId, username },
          };
        }
        
        // Send welcome/help message
        await sendMessage(chatId, result);
      }
    }
  }
  
  if (update.callback_query) {
    const query = update.callback_query;
    await answerCallbackQuery(query.id);
    
    if (query.data) {
      const [action, ...params] = query.data.split(":");
      return {
        action,
        data: {
          chatId: query.message?.chat.id.toString(),
          params,
        },
      };
    }
  }
  
  return null;
}

// ============================================
// Notification Senders
// ============================================

export async function sendPropertyNotification(
  chatId: string,
  notification: PropertyNotification
): Promise<boolean> {
  const { text, buttons } = buildPropertyNotificationMessage(notification);
  
  return sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
  });
}

export async function sendDailySummary(
  chatId: string,
  summary: DailySummaryNotification
): Promise<boolean> {
  const { text, buttons } = buildDailySummaryMessage(summary);
  
  return sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function sendWelcomeMessage(
  chatId: string,
  userName?: string
): Promise<boolean> {
  const text = `✅ <b>Účet úspešne prepojený!</b>

${userName ? `Ahoj ${userName}! ` : ""}Tvoj Telegram je teraz prepojený so SRIA.

Budeš dostávať notifikácie o:
🎯 Market Gaps
📉 Cenových poklesoch
🔥 Hot Deals
💰 Vysokých výnosoch

Nastavenia môžeš zmeniť v aplikácii SRIA alebo príkazom /settings.

Prajeme úspešné investovanie! 🏠💰`;
  
  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📱 Otvoriť SRIA",
            url: `${process.env.NEXTAUTH_URL || "https://sria.sk"}/dashboard`,
          },
        ],
      ],
    },
  });
}

export async function sendDisconnectedMessage(chatId: string): Promise<boolean> {
  return sendMessage(
    chatId,
    `🔌 <b>Telegram odpojený</b>

Tvoj Telegram bol odpojený od SRIA. Nebudeš už dostávať notifikácie.

Ak chceš znova pripojiť, použi príkaz /start alebo choď do Nastavenia v aplikácii SRIA.`
  );
}
