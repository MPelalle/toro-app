import "server-only";

import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, verificationUrl: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error("Falta configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD o SMTP_FROM.");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Confirmá tu cuenta de Toro",
    text: `Confirmá tu correo para entrar a Toro: ${verificationUrl}`,
    html: `<p>Confirmá tu correo para entrar a Toro.</p><p><a href="${verificationUrl}">Confirmar mi cuenta</a></p><p>El enlace vence en 24 horas.</p>`,
  });
}
