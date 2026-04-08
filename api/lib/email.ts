import nodemailer from "nodemailer";
import { getConfig } from "./config.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const config = getConfig();
  if (!config.smtp.host || !config.smtp.user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const config = getConfig();
  const html = `
    <p>Вы запросили сброс пароля.</p>
    <p><a href="${resetUrl}">Создать новый пароль</a></p>
    <p>Ссылка действует ограниченное время. Если вы не запрашивали сброс, проигнорируйте письмо.</p>
  `;

  const t = getTransporter();
  if (!t) {
    if (config.isDev) {
      console.info("[email:dev] Password reset link for", to, "→", resetUrl);
      return;
    }
    console.warn("[email] SMTP not configured; reset email not sent");
    return;
  }

  await t.sendMail({
    from: config.smtp.from,
    to,
    subject: "Сброс пароля",
    text: `Сброс пароля: ${resetUrl}`,
    html,
  });
}
