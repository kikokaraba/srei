/**
 * User Alerts System
 * 
 * Sends notifications to users when their saved/watched properties change.
 * Supports multiple notification channels: in-app, email, Telegram.
 */

import { prisma } from "@/lib/prisma";

export interface PropertyAlert {
  propertyId: string;
  type: "PRICE_DROP" | "PRICE_INCREASE" | "SOLD" | "NEW_MATCH" | "BACK_ON_MARKET";
  title: string;
  message: string;
  oldValue?: number;
  newValue?: number;
  changePercent?: number;
  propertyTitle?: string;
  propertyUrl?: string;
}

export interface UserAlert extends PropertyAlert {
  userId: string;
  userEmail: string;
  telegramChatId?: string | null;
  notificationPreferences: {
    priceDrops: boolean;
    newProperties: boolean;
    telegram: boolean;
    email: boolean;
  };
}

/**
 * Find users who should be notified about a property change
 */
export async function findUsersToNotify(
  propertyId: string,
  alertType: PropertyAlert["type"]
): Promise<UserAlert[]> {
  // Find users who have this property saved
  const savedByUsers = await prisma.savedProperty.findMany({
    where: {
      propertyId,
      alertOnChange: true,
    },
    include: {
      user: {
        include: {
          preferences: true,
        },
      },
      property: true,
    },
  });

  const alerts: UserAlert[] = [];

  for (const saved of savedByUsers) {
    const prefs = saved.user.preferences;
    
    // Check if user wants this type of notification
    let shouldNotify = false;
    
    switch (alertType) {
      case "PRICE_DROP":
        shouldNotify = prefs?.notifyPriceDrops ?? true;
        break;
      case "PRICE_INCREASE":
        shouldNotify = prefs?.notifyPriceDrops ?? true; // Same preference
        break;
      case "SOLD":
        shouldNotify = true; // Always notify about sold
        break;
      case "NEW_MATCH":
        shouldNotify = prefs?.notifyNewProperties ?? true;
        break;
      case "BACK_ON_MARKET":
        shouldNotify = true;
        break;
    }

    if (shouldNotify) {
      alerts.push({
        propertyId,
        type: alertType,
        title: "",
        message: "",
        userId: saved.userId,
        userEmail: saved.user.email,
        telegramChatId: prefs?.telegramChatId,
        propertyTitle: saved.property.title,
        propertyUrl: saved.property.source_url || undefined,
        notificationPreferences: {
          priceDrops: prefs?.notifyPriceDrops ?? true,
          newProperties: prefs?.notifyNewProperties ?? true,
          telegram: prefs?.telegramEnabled ?? false,
          email: true, // Default to email
        },
      });
    }
  }

  return alerts;
}

/**
 * Send price change alert to all interested users
 */
export async function sendPriceChangeAlert(
  propertyId: string,
  oldPrice: number,
  newPrice: number
): Promise<{ sent: number; errors: number }> {
  const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
  const alertType: PropertyAlert["type"] = changePercent < 0 ? "PRICE_DROP" : "PRICE_INCREASE";

  const usersToNotify = await findUsersToNotify(propertyId, alertType);
  
  let sent = 0;
  let errors = 0;

  for (const alert of usersToNotify) {
    const emoji = changePercent < 0 ? "📉" : "📈";
    const direction = changePercent < 0 ? "klesla" : "stúpla";
    
    alert.title = `${emoji} Cena ${direction}`;
    alert.message = `Nehnuteľnosť "${alert.propertyTitle}" - cena ${direction} z €${oldPrice.toLocaleString()} na €${newPrice.toLocaleString()} (${changePercent.toFixed(1)}%)`;
    alert.oldValue = oldPrice;
    alert.newValue = newPrice;
    alert.changePercent = changePercent;

    try {
      // Send in-app notification
      await createInAppNotification(alert);
      
      // Send Telegram if enabled
      if (alert.notificationPreferences.telegram && alert.telegramChatId) {
        await sendTelegramAlert(alert);
      }
      
      sent++;
    } catch (error) {
      console.error(`Failed to send alert to user ${alert.userId}:`, error);
      errors++;
    }
  }

  return { sent, errors };
}

/**
 * Send sold/removed alert to all interested users
 */
export async function sendSoldAlert(
  propertyId: string,
  finalPrice: number
): Promise<{ sent: number; errors: number }> {
  const usersToNotify = await findUsersToNotify(propertyId, "SOLD");
  
  let sent = 0;
  let errors = 0;

  for (const alert of usersToNotify) {
    alert.title = "🏠 Nehnuteľnosť predaná";
    alert.message = `Nehnuteľnosť "${alert.propertyTitle}" bola predaná/odstránená z ponuky.`;
    alert.newValue = finalPrice;

    try {
      await createInAppNotification(alert);
      
      if (alert.notificationPreferences.telegram && alert.telegramChatId) {
        await sendTelegramAlert(alert);
      }
      
      sent++;
    } catch (error) {
      console.error(`Failed to send sold alert to user ${alert.userId}:`, error);
      errors++;
    }
  }

  return { sent, errors };
}

/**
 * Find properties matching user's watchdog criteria and send alerts
 */
export async function checkWatchdogMatches(userId: string): Promise<PropertyAlert[]> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) return [];

  // Build query based on preferences
  const where: any = {
    status: "ACTIVE",
    listing_type: "PREDAJ",
  };

  // Price filters
  if (preferences.minPrice) where.price = { gte: preferences.minPrice };
  if (preferences.maxPrice) {
    where.price = { ...where.price, lte: preferences.maxPrice };
  }

  // Area filters
  if (preferences.minArea) where.area_m2 = { gte: preferences.minArea };
  if (preferences.maxArea) {
    where.area_m2 = { ...where.area_m2, lte: preferences.maxArea };
  }

  // Rooms filters
  if (preferences.minRooms) where.rooms = { gte: preferences.minRooms };
  if (preferences.maxRooms) {
    where.rooms = { ...where.rooms, lte: preferences.maxRooms };
  }

  // Location filters
  const trackedCities = JSON.parse(preferences.trackedCities || "[]");
  if (trackedCities.length > 0) {
    where.city = { in: trackedCities };
  }

  // Only get properties from last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  where.createdAt = { gte: oneDayAgo };

  // Exclude already saved properties
  const savedPropertyIds = await prisma.savedProperty.findMany({
    where: { userId },
    select: { propertyId: true },
  });
  
  if (savedPropertyIds.length > 0) {
    where.id = { notIn: savedPropertyIds.map(s => s.propertyId) };
  }

  // Find matching properties
  const matches = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10, // Limit to prevent spam
  });

  return matches.map(property => ({
    propertyId: property.id,
    type: "NEW_MATCH" as const,
    title: "🎯 Nová zhoda s watchdog kritériami",
    message: `${property.title} - €${property.price.toLocaleString()}`,
    propertyTitle: property.title,
    propertyUrl: property.source_url || undefined,
    newValue: property.price,
  }));
}

/**
 * Create in-app notification
 */
async function createInAppNotification(alert: UserAlert): Promise<void> {
  // For now, we'll just log it - you can add a Notification model later
  console.log(`📬 In-app notification for ${alert.userId}: ${alert.title}`);
  
  // TODO: Create Notification record in database
  // await prisma.notification.create({
  //   data: {
  //     userId: alert.userId,
  //     type: alert.type,
  //     title: alert.title,
  //     message: alert.message,
  //     propertyId: alert.propertyId,
  //     isRead: false,
  //   },
  // });
}

/**
 * Send Telegram notification
 */
async function sendTelegramAlert(alert: UserAlert): Promise<void> {
  if (!alert.telegramChatId) return;
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  const message = `
${alert.title}

${alert.message}

${alert.propertyUrl ? `🔗 ${alert.propertyUrl}` : ""}
`.trim();

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: alert.telegramChatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

/**
 * Process all watchdog alerts for all users
 */
export async function processAllWatchdogAlerts(): Promise<{
  usersProcessed: number;
  alertsSent: number;
}> {
  // Get all users with watchdog preferences
  const usersWithPrefs = await prisma.userPreferences.findMany({
    where: {
      notifyNewProperties: true,
    },
    select: {
      userId: true,
      telegramChatId: true,
      telegramEnabled: true,
    },
  });

  let alertsSent = 0;

  for (const user of usersWithPrefs) {
    const matches = await checkWatchdogMatches(user.userId);
    
    for (const match of matches) {
      try {
        const fullAlert: UserAlert = {
          ...match,
          userId: user.userId,
          userEmail: "", // Not needed for this
          telegramChatId: user.telegramChatId,
          notificationPreferences: {
            priceDrops: true,
            newProperties: true,
            telegram: user.telegramEnabled,
            email: true,
          },
        };

        await createInAppNotification(fullAlert);
        
        if (user.telegramEnabled && user.telegramChatId) {
          await sendTelegramAlert(fullAlert);
        }
        
        alertsSent++;
      } catch (error) {
        console.error(`Failed to send watchdog alert:`, error);
      }
    }
  }

  return {
    usersProcessed: usersWithPrefs.length,
    alertsSent,
  };
}
