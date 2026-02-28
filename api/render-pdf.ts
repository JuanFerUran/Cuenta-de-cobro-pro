import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from 'chrome-aws-lambda';

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
    console.log('chromium.executablePath ->', executablePath);
    // Use chromium.puppeteer to avoid mismatched puppeteer-core versions
    browser = await chromium.puppeteer.launch({
      args: chromium.args.concat(['--disable-dev-shm-usage', '--no-sandbox']),
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

    // Signal the app to render the preview at full A4 dimensions
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('axyra_pdf_print_mode', '1');
      } catch (e) {}
    });

    // A4 dimensions in pixels at 96 DPI (standard screen DPI)
    const pageWidthMM = 210;
    const pageHeightMM = 297;
    const DPI_MULTIPLIER = 96 / 25.4; // Convert mm to px at 96 DPI
    const pxWidth = Math.round(pageWidthMM * DPI_MULTIPLIER); // ~793px
    const pxHeight = Math.round(pageHeightMM * DPI_MULTIPLIER); // ~1122px

    // Set viewport to match A4 exactly
    await page.setViewport({ 
      width: pxWidth, 
      height: 2400,  // Taller viewport to capture full content
      deviceScaleFactor: 1 
    });

    // navigate to page and wait until network idle
    const target = host;
    console.log(`Navigating to: ${target}`);
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for Tailwind CSS to be fully loaded
    console.log('Waiting for styles and fonts to load...');
    try {
      await page.evaluate(() => (document as any).fonts.ready);
    } catch (e) {
      console.warn('Font loading failed:', e);
    }

    // Wait for all images to load
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

    // Additional wait for Tailwind to process
    await page.waitForTimeout(1000);

    // wait for the preview element and ensure it's rendered
    console.log('Waiting for invoice preview element...');
    const el = await page.waitForSelector('#invoice-preview', { timeout: 15000 });

    const box = await el.boundingBox();
    if (!box) throw new Error('Could not determine preview bounding box');

    console.log(`Preview dimensions: ${box.width}x${box.height}px`);

    // scroll element into view at top-left to ensure page.pdf captures it correctly
    await page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'start' });
        // Ensure element is at the top of the page
        window.scrollY === 0;
      }
    }, '#invoice-preview');

    await page.waitForTimeout(500);

    // Calculate actual height needed based on content
    const contentHeightPx = Math.ceil(box.height);
    const contentHeightMM = (contentHeightPx / DPI_MULTIPLIER);

    console.log(`Generating PDF: ${pageWidthMM}x${contentHeightMM.toFixed(2)}mm`);

    // Generate PDF with exact A4 width but dynamic height
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

    console.log('PDF generated successfully');
  } catch (err) {
    console.error('render-pdf error', err);
    res.status(500).send(`Failed to render PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    if (browser) await browser.close();
  }
}
