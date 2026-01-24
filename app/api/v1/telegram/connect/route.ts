// Telegram Connection API
// Generates connection link and manages Telegram connection

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "SRIABot";

// GET - Get connection status and link
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["ADMIN", "PREMIUM_INVESTOR"].includes(user.role)) {
      return NextResponse.json({
        error: "Pro subscription required",
        isPro: false,
        upgradeUrl: "/pricing",
      }, { status: 403 });
    }

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: {
        telegramChatId: true,
        telegramUsername: true,
        telegramConnectedAt: true,
        telegramEnabled: true,
        notifyMarketGaps: true,
        notifyPriceDrops: true,
        notifyNewProperties: true,
        notifyHighYield: true,
        notifyDistressed: true,
        notifyUrbanDevelopment: true,
        notificationFrequency: true,
      },
    });

    // Generate connection link (using userId as simple token)
    // In production, generate a temporary secure token
    const connectLink = `https://t.me/${BOT_USERNAME}?start=${session.user.id}`;

    return NextResponse.json({
      isPro: true,
      isConnected: !!preferences?.telegramChatId,
      telegramUsername: preferences?.telegramUsername,
      telegramConnectedAt: preferences?.telegramConnectedAt,
      telegramEnabled: preferences?.telegramEnabled ?? false,
      connectLink,
      notifications: preferences ? {
        marketGaps: preferences.notifyMarketGaps,
        priceDrops: preferences.notifyPriceDrops,
        newProperties: preferences.notifyNewProperties,
        highYield: preferences.notifyHighYield,
        distressed: preferences.notifyDistressed,
        urbanDevelopment: preferences.notifyUrbanDevelopment,
        frequency: preferences.notificationFrequency,
      } : null,
    });
  } catch (error) {
    console.error("Telegram connect GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update Telegram settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, settings } = body;

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!preferences) {
      return NextResponse.json(
        { error: "User preferences not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "enable":
        await prisma.userPreferences.update({
          where: { id: preferences.id },
          data: { telegramEnabled: true },
        });
        return NextResponse.json({ success: true, enabled: true });

      case "disable":
        await prisma.userPreferences.update({
          where: { id: preferences.id },
          data: { telegramEnabled: false },
        });
        return NextResponse.json({ success: true, enabled: false });

      case "disconnect":
        await prisma.userPreferences.update({
          where: { id: preferences.id },
          data: {
            telegramChatId: null,
            telegramUsername: null,
            telegramConnectedAt: null,
            telegramEnabled: false,
          },
        });
        return NextResponse.json({ success: true, disconnected: true });

      case "update_notifications":
        if (settings) {
          await prisma.userPreferences.update({
            where: { id: preferences.id },
            data: {
              notifyMarketGaps: settings.marketGaps ?? preferences.notifyMarketGaps,
              notifyPriceDrops: settings.priceDrops ?? preferences.notifyPriceDrops,
              notifyNewProperties: settings.newProperties ?? preferences.notifyNewProperties,
              notifyHighYield: settings.highYield ?? preferences.notifyHighYield,
              notifyDistressed: settings.distressed ?? preferences.notifyDistressed,
              notifyUrbanDevelopment: settings.urbanDevelopment ?? preferences.notifyUrbanDevelopment,
              notificationFrequency: settings.frequency ?? preferences.notificationFrequency,
            },
          });
        }
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Telegram connect POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect Telegram
export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (preferences?.telegramChatId) {
      // Import dynamically to avoid issues if telegram module has errors
      const { sendDisconnectedMessage } = await import("@/lib/telegram/bot");
      await sendDisconnectedMessage(preferences.telegramChatId);
    }

    await prisma.userPreferences.update({
      where: { userId: session.user.id },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramConnectedAt: null,
        telegramEnabled: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
