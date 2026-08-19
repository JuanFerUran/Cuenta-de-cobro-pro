import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const ALLOWED_TO_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_FILENAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;

function safeString(value: unknown, maxBytes = 2000): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxBytes).trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ message: 'Payload muy grande' });
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const to = safeString(rawBody.to, MAX_EMAIL_LENGTH);
  const subject = safeString(rawBody.subject, 255);
  const text = safeString(rawBody.text, 8000);
  const filename = safeString(rawBody.filename, MAX_FILENAME_LENGTH);
  const pdfBase64 = rawBody.pdfBase64 as string | undefined;

  if (!to || !pdfBase64) {
    return res.status(400).json({ message: 'Faltan campos obligatorios (to, pdfBase64)' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ message: 'Email de destino inválido' });
  }

  const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    return res.status(500).json({
      success: false,
      message: 'Configuración incompleta del SMTP. Contacta al administrador.'
    });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, FROM_NAME } = process.env;

  let transporter: nodemailer.Transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 465,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  } catch (smtpConfigError) {
    console.error('[send-email] Transporter config error');
    return res.status(500).json({
      success: false,
      message: 'Error de configuración SMTP'
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME || 'Facturación'}" <${SMTP_USER}>`,
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: pdfBase64,
          encoding: 'base64'
        }
      ]
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: unknown) {
    console.error('[send-email] SMTP send error');
    return res.status(500).json({
      success: false,
      message: 'No se pudo enviar el correo. Revisa la configuración SMTP.'
    });
  }
}
