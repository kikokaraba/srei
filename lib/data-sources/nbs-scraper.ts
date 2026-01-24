// NBS Scraper - Automatické sťahovanie dát z NBS
// Kontroluje nové publikácie a notifikuje pri aktualizácii

import { prisma } from "@/lib/prisma";

// NBS URL pre Excel súbory s cenami nehnuteľností
const NBS_URLS = {
  // Hlavná stránka s dátami
  mainPage: "https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/",
  // PDF report s vývojom cien (obsahuje aktuálne čísla)
  quarterlyReport: "https://nbs.sk/dokument/671a801a-030c-425d-9c83-b4d8165a503b/stiahnut",
  // Stránka s krajmi
  byRegions: "https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/ceny-nehnutelnosti-na-byvanie-podla-krajov/",
};

// Harmonogram publikácií NBS (približne 45 dní po konci štvrťroka)
const NBS_PUBLISH_SCHEDULE = {
  Q1: { month: 5, day: 15 },  // Q1 dáta -> polovica mája
  Q2: { month: 8, day: 15 },  // Q2 dáta -> polovica augusta
  Q3: { month: 11, day: 15 }, // Q3 dáta -> polovica novembra
  Q4: { month: 2, day: 15 },  // Q4 dáta -> polovica februára (nasledujúci rok)
};

interface NBSScrapedData {
  quarter: number;
  year: number;
  nationalAverage: number;
  apartmentAverage: number;
  houseAverage: number;
  changeYoY: number;
  changeQoQ: number;
  regions: {
    name: string;
    pricePerSqm: number;
    changeQoQ: number;
  }[];
  scrapedAt: Date;
  source: string;
}

interface ScraperResult {
  success: boolean;
  isNewData: boolean;
  data?: NBSScrapedData;
  error?: string;
  notificationSent?: boolean;
}

/**
 * Kontroluje či sú dostupné nové NBS dáta
 */
export async function checkForNewNBSData(): Promise<{
  hasNewData: boolean;
  expectedQuarter: string;
  expectedDate: Date;
}> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  // Urč ktorý štvrťrok by mal byť práve publikovaný
  let expectedQuarter: number;
  let expectedYear: number;
  
  if (currentMonth >= 2 && currentMonth < 5) {
    // Feb-Apr: Očakávame Q4 predchádzajúceho roka
    expectedQuarter = 4;
    expectedYear = currentYear - 1;
  } else if (currentMonth >= 5 && currentMonth < 8) {
    // Máj-Júl: Očakávame Q1
    expectedQuarter = 1;
    expectedYear = currentYear;
  } else if (currentMonth >= 8 && currentMonth < 11) {
    // Aug-Okt: Očakávame Q2
    expectedQuarter = 2;
    expectedYear = currentYear;
  } else {
    // Nov-Jan: Očakávame Q3
    expectedQuarter = 3;
    expectedYear = currentMonth >= 11 ? currentYear : currentYear - 1;
  }
  
  // Skontroluj či už máme tieto dáta v databáze
  const existingData = await prisma.nBSPropertyPrice.findFirst({
    where: {
      year: expectedYear,
      quarter: expectedQuarter,
    },
  });
  
  const scheduleKey = `Q${expectedQuarter}` as keyof typeof NBS_PUBLISH_SCHEDULE;
  const schedule = NBS_PUBLISH_SCHEDULE[scheduleKey];
  const expectedDate = new Date(
    expectedQuarter === 4 ? expectedYear + 1 : expectedYear,
    schedule.month - 1,
    schedule.day
  );
  
  return {
    hasNewData: !existingData && now >= expectedDate,
    expectedQuarter: `Q${expectedQuarter} ${expectedYear}`,
    expectedDate,
  };
}

/**
 * Scrapuje NBS stránku pre nové dáta
 * Poznámka: V produkcii by sme parsovali Excel súbor
 */
export async function scrapeNBSData(): Promise<ScraperResult> {
  try {
    // Skontroluj či sú nové dáta
    const { hasNewData, expectedQuarter } = await checkForNewNBSData();
    
    if (!hasNewData) {
      return {
        success: true,
        isNewData: false,
        error: `Žiadne nové dáta. Posledné očakávané: ${expectedQuarter}`,
      };
    }
    
    // Fetch hlavnú stránku NBS
    const response = await fetch(NBS_URLS.mainPage, {
      headers: {
        "User-Agent": "SRIA-Bot/1.0 (Real Estate Analytics Platform)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    
    if (!response.ok) {
      throw new Error(`NBS request failed: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parsuj HTML pre nájdenie odkazu na najnovší report
    // Hľadáme link obsahujúci "Vývoj cien nehnuteľností"
    const reportLinkMatch = html.match(/href="([^"]*dokument[^"]*stiahnut[^"]*)"/);
    
    if (!reportLinkMatch) {
      return {
        success: false,
        isNewData: false,
        error: "Nepodarilo sa nájsť odkaz na report",
      };
    }
    
    // V produkcii by sme tu stiahli a sparsovali PDF/Excel
    // Pre teraz vrátime info že treba manuálnu kontrolu
    
    return {
      success: true,
      isNewData: true,
      data: undefined, // Manuálna kontrola potrebná
      error: `Nové dáta dostupné! Odkaz: ${reportLinkMatch[1]}. Potrebná manuálna kontrola.`,
    };
    
  } catch (error) {
    return {
      success: false,
      isNewData: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Odošle notifikáciu o nových dátach
 */
export async function sendNewDataNotification(data: {
  quarter: string;
  reportUrl?: string;
  message: string;
}): Promise<boolean> {
  try {
    // 1. Email notifikácia (ak je nastavený SMTP)
    if (process.env.SMTP_HOST && process.env.NOTIFICATION_EMAIL) {
      await sendEmailNotification(data);
    }
    
    // 2. Webhook notifikácia (Slack, Discord, atď.)
    if (process.env.NOTIFICATION_WEBHOOK_URL) {
      await sendWebhookNotification(data);
    }
    
    // 3. Uloženie do databázy pre admin panel
    await prisma.dataFetchLog.create({
      data: {
        source: "NBS_NOTIFICATION",
        status: "notification_sent",
        error: JSON.stringify(data),
      },
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return false;
  }
}

/**
 * Email notifikácia
 */
async function sendEmailNotification(data: {
  quarter: string;
  reportUrl?: string;
  message: string;
}): Promise<void> {
  // Použijeme nodemailer alebo resend
  // Pre teraz len logujeme
  console.log("📧 Email notification would be sent:", data);
  
  // V produkcii:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({
  //   to: process.env.NOTIFICATION_EMAIL,
  //   subject: `SRIA: Nové NBS dáta - ${data.quarter}`,
  //   html: `...`
  // });
}

/**
 * Webhook notifikácia (Slack, Discord, custom)
 */
async function sendWebhookNotification(data: {
  quarter: string;
  reportUrl?: string;
  message: string;
}): Promise<void> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  // Slack format
  const payload = {
    text: `🏠 *SRIA: Nové NBS dáta dostupné*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.quarter}*\n${data.message}`,
        },
      },
      ...(data.reportUrl ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📊 <${data.reportUrl}|Stiahnuť report>`,
        },
      }] : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Otvoriť Admin Panel" },
            url: `${process.env.NEXTAUTH_URL}/admin/data`,
          },
        ],
      },
    ],
  };
  
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Hlavná funkcia pre cron job
 */
export async function runNBSDataCheck(): Promise<{
  checked: boolean;
  newDataFound: boolean;
  notificationSent: boolean;
  message: string;
}> {
  console.log("🔍 Checking for new NBS data...");
  
  const { hasNewData, expectedQuarter, expectedDate } = await checkForNewNBSData();
  
  if (!hasNewData) {
    const nextCheck = expectedDate.toLocaleDateString("sk-SK");
    return {
      checked: true,
      newDataFound: false,
      notificationSent: false,
      message: `Žiadne nové dáta. Očakávané ${expectedQuarter} okolo ${nextCheck}`,
    };
  }
  
  // Skúsime scrapnúť
  const scrapeResult = await scrapeNBSData();
  
  if (scrapeResult.isNewData) {
    // Pošleme notifikáciu
    const notificationSent = await sendNewDataNotification({
      quarter: expectedQuarter,
      message: scrapeResult.error || "Nové dáta sú dostupné na NBS stránke.",
    });
    
    return {
      checked: true,
      newDataFound: true,
      notificationSent,
      message: `Nové dáta ${expectedQuarter} nájdené! Notifikácia: ${notificationSent ? "odoslaná" : "zlyhala"}`,
    };
  }
  
  return {
    checked: true,
    newDataFound: false,
    notificationSent: false,
    message: scrapeResult.error || "Kontrola dokončená",
  };
}
