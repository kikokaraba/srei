/**
 * Railway Cron Starter
 * 
 * This script runs alongside the Next.js server and handles cron jobs.
 * Add to Railway start command: node scripts/start-cron.js &
 */

const JOBS = [
  {
    name: "scrape-slovakia",
    endpoint: "/api/cron/scrape-slovakia?portal=bazos",
    intervalMs: 30 * 60 * 1000, // 30 minutes - Bazoš
  },
  {
    name: "batch-refresh",
    endpoint: "/api/cron/batch-refresh",
    intervalMs: 15 * 60 * 1000, // 15 minutes
  },
  {
    name: "scrape-bank-rates",
    endpoint: "/api/cron/scrape-bank-rates",
    intervalMs: 24 * 60 * 60 * 1000, // 1x denne – úrokové sadzby bánk
  },
];

const BASE_URL = process.env.RAILWAY_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

async function runJob(job: typeof JOBS[0]) {
  const url = `${BASE_URL}${job.endpoint}`;
  console.log(`[CRON] Running ${job.name}...`);
  
  try {
    const response = await fetch(url, { method: "POST" });
    const result = await response.json();
    console.log(`[CRON] ${job.name} completed:`, result.success ? "✅" : "❌");
  } catch (error) {
    console.error(`[CRON] ${job.name} failed:`, error);
  }
}

function startCronJobs() {
  console.log("[CRON] Starting cron jobs...");
  console.log(`[CRON] Base URL: ${BASE_URL}`);
  
  // Wait 30 seconds for server to start
  setTimeout(() => {
    JOBS.forEach(job => {
      console.log(`[CRON] Scheduling ${job.name} every ${job.intervalMs / 1000 / 60} minutes`);
      
      // Run immediately
      runJob(job);
      
      // Then run on interval
      setInterval(() => runJob(job), job.intervalMs);
    });
  }, 30000);
}

startCronJobs();

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
