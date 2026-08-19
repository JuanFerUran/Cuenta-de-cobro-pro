import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from 'chrome-aws-lambda';

function buildRenderError(message: string, status = 500): string {
  console.error('[render-pdf]', message);
  return `Failed to render PDF: ${message}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // SSRF mitigation: ignore client-provided url and use only the app URL.
  const protocol = process.env.VERCEL_URL ? 'https' : 'http';
  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (req.headers.host ? `${protocol}://${req.headers.host}` : null);

  if (!host) {
    res.status(400).send('No target URL provided');
    return;
  }

  const target = host;

  let browser = null;
  try {
    const executablePath = await chromium.executablePath;
    browser = await chromium.puppeteer.launch({
      args: chromium.args.concat(['--disable-dev-shm-usage', '--no-sandbox']),
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || undefined,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // If state provided, inject into localStorage before any script runs.
    const { state } = (req.body ?? {}) as { state?: unknown };
    if (state) {
      await page.evaluateOnNewDocument((s) => {
        try {
          localStorage.setItem('axyra_invoice_state_v4', JSON.stringify(s));
        } catch (e) {
          // ignore
        }
      }, state);
    }

    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('axyra_pdf_print_mode', '1');
      } catch (e) {
        // ignore
      }
    });

    const pageWidthMM = 210;
    const pageHeightMM = 297;
    const DPI_MULTIPLIER = 96 / 25.4;
    const pxWidth = Math.round(pageWidthMM * DPI_MULTIPLIER);
    const pxHeight = Math.round(pageHeightMM * DPI_MULTIPLIER);

    await page.setViewport({
      width: pxWidth,
      height: 2400,
      deviceScaleFactor: 1,
    });

    // Navigate to the application, not an arbitrary URL.
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });

    try {
      await page.evaluate(() => (document as any).fonts.ready);
    } catch (e) {
      // ignore font loading issues
    }

    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const imgs = document.querySelectorAll('img');
        let loaded = 0;
        if (imgs.length === 0) {
          resolve();
          return;
        }
        imgs.forEach((img) => {
          if (img.complete) {
            loaded++;
            if (loaded === imgs.length) resolve();
          } else {
            img.addEventListener('load', () => {
              loaded++;
              if (loaded === imgs.length) resolve();
            });
            img.addEventListener('error', () => {
              loaded++;
              if (loaded === imgs.length) resolve();
            });
          }
        });
      });
    });

    await page.waitForTimeout(1000);

    const el = await page.waitForSelector('#invoice-preview', { timeout: 15000 });
    const box = await el.boundingBox();
    if (!box) throw new Error('Could not determine preview bounding box');

    await page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'start' });
        // keep original scroll behavior; server renders at top anyway
      }
    }, '#invoice-preview');

    await page.waitForTimeout(500);

    const contentHeightPx = Math.ceil(box.height);
    const contentHeightMM = contentHeightPx / DPI_MULTIPLIER;

    const pdfBuffer = await page.pdf({
      format: 'a4',
      width: `${pageWidthMM}mm`,
      height: `${Math.max(pageHeightMM, contentHeightMM)}mm`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      displayHeaderFooter: false,
      scale: 1,
      preferCSSPageSize: false,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('render-pdf error', err);
    res.status(500).send(buildRenderError(err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    if (browser) await browser.close();
  }
}
