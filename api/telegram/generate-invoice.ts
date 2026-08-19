import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildInvoiceHtml } from '../../services/invoiceTemplate.js';
import type { AppState } from '../../types';

// Rate limiting: in-memory map, cleared on function restart (acceptable for Telegram)
const rateLimitWindowMs = 3600 * 1000; // 1 hour
const maxRequestsPerWindow = 10;
const rateLimits = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(telegramChatId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(telegramChatId);

  if (!entry || now - entry.windowStart > rateLimitWindowMs) {
    rateLimits.set(telegramChatId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxRequestsPerWindow) {
    return false;
  }

  entry.count += 1;
  return true;
}

function buildError(res: VercelResponse, message: string, status = 400) {
  console.error('[telegram/generate-invoice]', message);
  res.status(status).json({ success: false, message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  // Authenticate via shared secret header
  const secret = req.headers['x-telegram-bot-secret'];
  if (secret !== process.env.TELEGRAM_BOT_SECRET) {
    console.error('[telegram/generate-invoice] Unauthorized request');
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const body = req.body ?? {};
  const {
    chatId,
    invoiceData,
  } = body as {
    chatId?: string | number;
    invoiceData?: Partial<AppState>;
  };

  if (!chatId) {
    return buildError(res, 'Missing chatId', 400);
  }

  if (!invoiceData) {
    return buildError(res, 'Missing invoiceData', 400);
  }

  // Rate limit check
  if (!checkRateLimit(String(chatId))) {
    return buildError(res, 'Demasiados intentos. Espera 1 hora.', 429);
  }

  // Validate required fields
  const required = ['myData', 'clientData', 'bankData', 'invoiceDetails', 'branding'] as const;
  for (const key of required) {
    if (!invoiceData[key]) {
      return buildError(res, `Missing invoiceData.${key}`, 400);
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  let browser = null;
  try {
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    const html = buildInvoiceHtml(invoiceData as AppState);
    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000,
    });

    await page.evaluate(async () => {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    });

    const pdfBuffer = await page.pdf({
      format: 'a4',
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });

    // Persist to Supabase if configured
    if (supabase && invoiceData.invoiceDetails) {
      try {
        const { error } = await supabase.from('invoices').insert({
          numero: invoiceData.invoiceDetails.numero,
          cliente_nombre: invoiceData.clientData?.nombre || '',
          cliente_nit: invoiceData.clientData?.nit || '',
          cliente_email: invoiceData.clientData?.email || null,
          emisor_nombre: invoiceData.myData?.nombre || '',
          emisor_documento: invoiceData.myData?.documento || '',
          emisor_telefono: invoiceData.myData?.telefono || null,
          emisor_direccion: invoiceData.myData?.direccion || null,
          banco: invoiceData.bankData?.banco || null,
          cuenta_tipo: invoiceData.bankData?.tipo || null,
          cuenta_numero: invoiceData.bankData?.numero || null,
          cuenta_titular: invoiceData.bankData?.titular || null,
          concepto: invoiceData.invoiceDetails.concepto || '',
          valor: invoiceData.invoiceDetails.valor || 0,
          fecha_emision: invoiceData.invoiceDetails.fechaEmision || null,
          fecha_vencimiento: invoiceData.invoiceDetails.fechaVencimiento || null,
          observaciones: invoiceData.invoiceDetails.observaciones || null,
          status: 'sent',
          telegram_user_id: null, // will be set after linking
        });
        if (error) console.error('[telegram/persist]', error);
      } catch (persistErr) {
        console.error('[telegram/persist error]', persistErr);
      }
    }

    // Return PDF as base64 for n8n to send
    const pdfBase64 = pdfBuffer.toString('base64');

    res.json({
      success: true,
      pdfBase64,
      numero: invoiceData.invoiceDetails.numero,
      filename: `${invoiceData.invoiceDetails.numero}.pdf`,
    });
  } catch (err) {
    console.error('[telegram/generate-invoice] error', err);
    res.status(500).json({ success: false, message: 'Error al generar PDF' });
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
