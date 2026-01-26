
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, text, filename, pdfBase64 } = req.body;

  if (!to || !pdfBase64) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Diagnostic: Check missing variables
  const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    return res.status(500).json({ 
      success: false, 
      message: `Configuración incompleta. Faltan variables: ${missing.join(', ')}. Agrégalas en Vercel y haz Redeploy.` 
    });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, FROM_NAME } = process.env;

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '465'),
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"${FROM_NAME || 'Facturación Axyra'}" <${SMTP_USER}>`,
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

    return res.status(200).json({ success: true, message: 'Correo enviado correctamente' });
  } catch (error: any) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error de conexión SMTP: ${error.message}. Revisa el Host, Puerto y Contraseña.` 
    });
  }
}
