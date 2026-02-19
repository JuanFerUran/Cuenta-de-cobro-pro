import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type ExportOptions = {
  scale?: number; // capture scale (DPI multiplier)
  multipage?: boolean; // whether to slice into multiple pages
};

/**
 * Captures a DOM element and exports it as an A4 PDF.
 * Supports higher DPI via `scale` and optional multipage slicing.
 */
export const exportPreviewAsPdf = async (
  elementId: string,
  filename = 'document.pdf',
  options: ExportOptions = { scale: 3, multipage: true }
) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element with id "${elementId}" not found`);

  const scale = options.scale ?? 3;
  const multipage = options.multipage ?? true;

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = 210; // mm
  const pageHeight = 297; // mm

  const imgWidthMM = pageWidth; // fit to width
  const pxPerMm = canvas.width / imgWidthMM;
  const totalImgHeightMM = canvas.height / pxPerMm;

  if (!multipage) {
    // Single page: scale down if height exceeds page height
    let drawWidth = imgWidthMM;
    let drawHeight = totalImgHeightMM;
    if (drawHeight > pageHeight) {
      const scaleFactor = pageHeight / drawHeight;
      drawWidth = drawWidth * scaleFactor;
      drawHeight = drawHeight * scaleFactor;
    }
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, drawWidth, drawHeight);
    pdf.save(filename);
    return;
  }

  // Multipage: slice vertically per page
  const pageHeightPx = Math.floor(pageHeight * pxPerMm);
  let y = 0;
  while (y < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = sliceCanvas.toDataURL('image/png');
    const sliceHeightMM = sliceHeight / pxPerMm;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, sliceHeightMM);
    y += sliceHeight;
    if (y < canvas.height) pdf.addPage();
  }

  pdf.save(filename);
};

export default exportPreviewAsPdf;
