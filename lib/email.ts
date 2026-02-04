import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
});

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

/**
 * Odošle email na obnovenie hesla. Ak SMTP nie je nakonfigurovaný, vracia false.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const fromRaw = process.env.SMTP_FROM || process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;
  if (!fromRaw) return false;
  const from = fromRaw.includes("<") ? fromRaw : `"SRIA" <${fromRaw}>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Obnovenie hesla – SRIA",
      text: `Obnovenie hesla\n\nKliknite na odkaz pre nastavenie nového hesla (platnosť 1 hodina):\n${resetUrl}\n\nAk ste tento email nepožiadali, ignorujte ho.`,
      html: `
        <p>Obnovenie hesla</p>
        <p>Kliknite na odkaz pre nastavenie nového hesla (platnosť 1 hodina):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Ak ste tento email nepožiadali, ignorujte ho.</p>
      `,
    });
    return true;
  } catch (err) {
    console.error("Send password reset email error:", err);
    return false;
  }
}
