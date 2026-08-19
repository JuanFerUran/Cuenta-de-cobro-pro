import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildInvoiceHtml } from '../services/invoiceTemplate.js';
import type { AppState } from '../types';

function buildRenderError(message: string, status = 500): string {
  console.error('[render-pdf]', message);
  return `Failed to render PDF: ${message}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Validate and sanitize request body
  const body = req.body ?? {};
  const { state } = body as { state?: unknown };

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    res.status(400).send('Missing or invalid required field: state');
    return;
  }

  // Defensive: ensure state has expected shape (no SSR via extra fields)
  const allowedKeys = new Set([
    'myData', 'clientData', 'bankData', 'invoiceDetails', 'editMyData', 'branding'
  ]);
  const sanitizedState = Object.fromEntries(
    Object.entries(state).filter(([k]) => allowedKeys.has(k))
  );

  // Type-safe cast after sanitization
  const invoiceState = sanitizedState as unknown as AppState;

  let browser = null;
  try {
    // Launch Chromium via @sparticuz/chromium (Vercel-compatible)
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // Build invoice HTML server-side — single source of truth, no SSRF
    const html = buildInvoiceHtml(invoiceState);

    // Set content directly — no navigation, no SSRF vector
    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000,
    });

    // Wait for fonts to load
    await page.evaluate(async () => {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    });

    // Generate PDF — A4, no margins, full page
    const pdfBuffer = await page.pdf({
      format: 'a4',
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('render-pdf error', err);
    res.status(500).send(buildRenderError(err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
