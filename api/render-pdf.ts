import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

// POST /api/render-pdf
// Body: { state: AppState, url?: string }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { state, url } = req.body || {};

  // decide target URL to render. Prefer explicit url, otherwise use deployment host.
  const protocol = process.env.VERCEL_URL ? 'https' : 'http';
  const host = url || (req.headers.host ? `${protocol}://${req.headers.host}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!host) {
    res.status(400).send('No target URL provided');
    return;
  }

  let browser = null;
  try {
    const executablePath = await chromium.executablePath;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || undefined,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // If state provided, inject into localStorage before any script runs
    if (state) {
      await page.evaluateOnNewDocument((s) => {
        try {
          localStorage.setItem('axyra_invoice_state_v4', s);
        } catch (e) {}
      }, JSON.stringify(state));
    }

    // navigate to page and wait until network idle
    const target = host;
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });

    // wait for the preview element
    await page.waitForSelector('#invoice-preview', { timeout: 15000 });

    // small delay for fonts/images
    await page.waitForTimeout(500);

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('render-pdf error', err);
    res.status(500).send('Failed to render PDF');
  } finally {
    if (browser) await browser.close();
  }
}
