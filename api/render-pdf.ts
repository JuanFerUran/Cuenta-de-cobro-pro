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

    const pageWidthMM = 210;
    const cssDpi = 96; // CSS pixels per inch baseline
    const pxWidth = Math.round((pageWidthMM * cssDpi) / 25.4);

    // set viewport width to A4 px width to match preview scaling
    await page.setViewport({ width: pxWidth, height: 1200 });

    // navigate to page and wait until network idle
    const target = host;
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });

    // wait for the preview element and ensure it's rendered
    const el = await page.waitForSelector('#invoice-preview', { timeout: 15000 });

    // wait for fonts/images to load fully
    try {
      await page.evaluate(() => (document as any).fonts.ready);
    } catch (e) {}
    await page.waitForTimeout(800);

    const box = await el.boundingBox();
    if (!box) throw new Error('Could not determine preview bounding box');

    // compute height in mm based on pxPerMm
    const pxPerMm = pxWidth / pageWidthMM;
    const heightMm = Math.ceil(box.height / pxPerMm);

    // scroll element into view at top-left to ensure page.pdf captures it correctly
    await page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'start' });
    }, '#invoice-preview');

    await page.waitForTimeout(300);

    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: `${pageWidthMM}mm`,
      height: `${heightMm}mm`,
    });

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
