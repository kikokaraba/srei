// Telegram Bot Types

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface SendMessageOptions {
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_markup?: TelegramReplyMarkup;
}

export interface TelegramReplyMarkup {
  inline_keyboard?: TelegramInlineKeyboard[][];
}

export interface TelegramInlineKeyboard {
  text: string;
  url?: string;
  callback_data?: string;
}

// Notification types
export type NotificationType =
  | "market_gap"
  | "price_drop"
  | "new_property"
  | "hot_deal"
  | "high_yield"
  | "distressed"
  | "urban_development"
  | "daily_summary";

export interface PropertyNotification {
  type: NotificationType;
  propertyId: string;
  title: string;
  city: string;
  district?: string;
  price: number;
  pricePerM2?: number;
  area?: number;
  rooms?: number;
  // Market gap specific
  gapPercent?: number;
  fairValue?: number;
  // Price drop specific
  oldPrice?: number;
  priceDropPercent?: number;
  // Yield specific
  yield?: number;
  // URL
  sourceUrl?: string;
  siteUrl?: string;
}

export interface DailySummaryNotification {
  type: "daily_summary";
  date: Date;
  newProperties: number;
  marketGaps: number;
  priceDrops: number;
  hotDeals: number;
  topDeals: PropertyNotification[];
}
