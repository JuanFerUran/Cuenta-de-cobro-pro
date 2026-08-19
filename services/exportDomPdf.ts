import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type ExportOptions = {
  scale?: number; // capture scale (DPI multiplier)
  multipage?: boolean; // whether to slice into multiple pages
};

/**
 * Captures a DOM element and exports it as an A4 PDF.
 * Works with Tailwind CSS by cloning the entire document context.
 */
export const exportPreviewAsPdf = async (
  elementId: string,
  filename = 'document.pdf',
  options: ExportOptions = { scale: 3, multipage: true }
) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element with id "${elementId}" not found`);

  const scale = options.scale ?? 2; // Lower default scale for better compatibility
  const multipage = options.multipage ?? true;

  try {
    // Get computed styles and clone all stylesheets to canvas
    const canvas = await html2canvas(el, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 30000,
      width: 793, // A4 width in pixels at 96 DPI
      windowWidth: 793,
      windowHeight: 1500
    });

    // Create PDF with exact A4 dimensions
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      precision: 2
    });

    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions maintaining aspect ratio
    const canvasAspect = canvas.width / canvas.height;
    const pageAspect = pageWidth / pageHeight;
    
    let drawWidth = pageWidth;
    let drawHeight = drawWidth / canvasAspect;

    if (!multipage) {
      // Single page: scale to fit
      if (drawHeight > pageHeight) {
        drawHeight = pageHeight;
        drawWidth = drawHeight * canvasAspect;
      }
      const offsetX = (pageWidth - drawWidth) / 2;
      pdf.addImage(imgData, 'PNG', offsetX, 0, drawWidth, drawHeight);
      pdf.save(filename);
    } else {
      // Multipage: split into A4 chunks
      const pageHeightPx = Math.floor((pageHeight / drawHeight) * canvas.height);
      let yPos = 0;
      let pageNum = 0;

      while (yPos < canvas.height) {
        if (pageNum > 0) pdf.addPage();

        const sliceHeight = Math.min(pageHeightPx, canvas.height - yPos);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        
        ctx.drawImage(
          canvas,
          0, yPos,
          canvas.width, sliceHeight,
          0, 0,
          canvas.width, sliceHeight
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png');
        const sliceHeight_mm = (sliceHeight / canvas.height) * drawHeight;
        
        pdf.addImage(sliceImgData, 'PNG', 0, 0, pageWidth, Math.min(sliceHeight_mm, pageHeight));
        
        yPos += sliceHeight;
        pageNum++;
      }

      pdf.save(filename);
    }
  } catch (err) {
    console.error('exportPreviewAsPdf error:', err);
    throw err;
  }
};

export default exportPreviewAsPdf;

// Helper: wait for images to load
function waitForImages(container: Element): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  if (imgs.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let loaded = 0;
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
}
