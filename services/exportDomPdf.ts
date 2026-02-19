import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element and exports it as an A4 PDF.
 * @param elementId id of the DOM node to capture
 * @param filename output filename
 */
export const exportPreviewAsPdf = async (elementId: string, filename = 'document.pdf') => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element with id "${elementId}" not found`);

  // Use higher scale for much sharper output (can be heavy on memory)
  const scale = 3; // 3x for higher DPI

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = 210; // mm
  const pageHeight = 297; // mm

  // When adding the full capture we may need multiple pages. We'll slice the canvas vertically.
  const imgWidthMM = pageWidth; // we fit image to page width

  // pixels per mm based on the captured canvas
  const pxPerMm = canvas.width / imgWidthMM;
  const pageHeightPx = Math.floor(pageHeight * pxPerMm);

  let y = 0;
  while (y < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);

    // create a canvas for the slice
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = sliceCanvas.toDataURL('image/png');

    // convert slice height in px to mm for PDF
    const sliceHeightMM = sliceHeight / pxPerMm;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, sliceHeightMM);

    y += sliceHeight;
    if (y < canvas.height) pdf.addPage();
  }

  pdf.save(filename);
};

export default exportPreviewAsPdf;
