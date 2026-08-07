import "server-only";

import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

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

  let confirmationUrl: URL;
  try {
    confirmationUrl = new URL(verificationUrl);
  } catch {
    throw new Error("El enlace de confirmación no es válido.");
  }
  if (!['http:', 'https:'].includes(confirmationUrl.protocol) || !confirmationUrl.searchParams.get("token")) {
    throw new Error("El enlace de confirmación no es válido.");
  }

  const safeUrl = escapeHtml(confirmationUrl.toString());
  const text = [
    "Confirmá tu correo para activar tu cuenta de Toro.",
    "",
    `Abrí este enlace: ${confirmationUrl.toString()}`,
    "",
    "El enlace vence en 24 horas. Si no creaste una cuenta en Toro, podés ignorar este correo.",
  ].join("\n");

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Confirmá tu cuenta de Toro",
    text,
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f3f5f1;font-family:Arial,Helvetica,sans-serif;color:#1a1e18;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f1;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(20,32,16,.12);">
          <tr><td style="background:#10140e;padding:28px 36px;">
            <p style="margin:0;color:#b7ff00;font-size:12px;font-weight:700;letter-spacing:2px;">TORO</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:28px;line-height:34px;font-weight:700;">Tu cuenta está casi lista.</h1>
          </td></tr>
          <tr><td style="padding:36px;">
            <p style="margin:0;font-size:16px;line-height:25px;">Confirmá tu correo para activar tu cuenta y empezar a organizar tus entrenamientos, nutrición y hábitos.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
              <tr><td align="center" bgcolor="#b7ff00" style="border-radius:10px;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;color:#10140e;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">Confirmar mi cuenta</a>
              </td></tr>
            </table>
            <p style="margin:0;color:#596256;font-size:13px;line-height:20px;">El enlace vence en 24 horas. Si no creaste una cuenta en Toro, podés ignorar este correo.</p>
            <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e8e3;color:#758073;font-size:12px;line-height:18px;word-break:break-all;">¿El botón no funciona? Copiá y pegá este enlace en tu navegador:<br><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#4a7d00;text-decoration:underline;">${safeUrl}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  });
}
