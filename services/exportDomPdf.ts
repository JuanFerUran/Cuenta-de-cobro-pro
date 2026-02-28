import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type ExportOptions = {
  scale?: number; // capture scale (DPI multiplier)
  multipage?: boolean; // whether to slice into multiple pages
};

/**
 * Captures a DOM element and exports it as an A4 PDF.
 * Supports higher DPI via `scale` and optional multipage slicing.
 * Optimized for Tailwind CSS and dynamic styles.
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

  // Calculate dimensions
  const baseA4WidthPx = 793; // A4 width at 96 DPI
  const baseDpi = 96;
  const targetDpi = baseDpi * (scale || 1);
  const pxWidth = Math.round((210 * targetDpi) / 25.4);

  // Clone the original element to preserve original styles
  const clone = el.cloneNode(true) as HTMLElement;

  // Copy all computed styles from original to clone recursively
  const copyComputedStyles = (originalNode: Element, cloneNode: Element) => {
    const computedStyle = window.getComputedStyle(originalNode);
    
    // Copy CSS properties
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i];
      const value = computedStyle.getPropertyValue(prop);
      (cloneNode as HTMLElement).style.setProperty(prop, value, 'important');
    }

    // Copy background color and other essential properties
    (cloneNode as HTMLElement).style.backgroundColor = computedStyle.backgroundColor;
    (cloneNode as HTMLElement).style.color = computedStyle.color;

    // Recursively copy styles for all children
    const originalChildren = Array.from(originalNode.children);
    const cloneChildren = Array.from(cloneNode.children);
    
    for (let i = 0; i < originalChildren.length; i++) {
      if (cloneChildren[i]) {
        copyComputedStyles(originalChildren[i], cloneChildren[i]);
      }
    }
  };

  // Apply forced layout styles to the clone
  clone.style.boxSizing = 'border-box';
  clone.style.width = `${pxWidth}px`;
  clone.style.maxWidth = `${pxWidth}px`;
  clone.style.minWidth = `${pxWidth}px`;
  clone.style.transform = 'none';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = '#ffffff';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.border = '0';
  clone.style.boxShadow = 'none';

  // Create wrapper container for proper CSS context
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${pxWidth}px`;
  wrapper.style.backgroundColor = '#ffffff';
  document.body.appendChild(wrapper);
  wrapper.appendChild(clone);

  try {
    // Copy all computed styles from original to ensure exact visual match
    copyComputedStyles(el, clone);

    // Wait for all resources to load
    await document.fonts.ready;
    await waitForImages(clone);

    // Additional delay for CSS rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    // Capture canvas with high quality
    const canvas = await html2canvas(clone, {
      allowTaint: true,
      useCORS: true,
      backgroundColor: '#ffffff',
      scale: 1,
      logging: false,
      imageTimeout: 10000,
      onclone: (clonedDoc) => {
        // Ensure styles are applied in cloned document context
        const clonedElement = clonedDoc.getElementById(elementId) || clonedDoc.body.querySelector('[id*="invoice"]');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.transform = 'none';
          (clonedElement as HTMLElement).style.boxShadow = 'none';
        }
      }
    });

    // Validate canvas was created
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to capture canvas - invalid dimensions');
    }

    // Create PDF
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });

    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const pxPerMm = pxWidth / pageWidth;
    const imgHeightMM = canvas.height / pxPerMm;

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png', 1.0);

    if (!multipage) {
      // Single page: fit entire document
      let drawWidth = pageWidth;
      let drawHeight = imgHeightMM;

      if (drawHeight > pageHeight) {
        // Scale down if exceeds page height
        const scaleFactor = pageHeight / drawHeight;
        drawWidth *= scaleFactor;
        drawHeight = pageHeight;
      }

      const xOffset = (pageWidth - drawWidth) / 2; // Center if scaled
      pdf.addImage(imgData, 'PNG', xOffset, 0, drawWidth, drawHeight, undefined, 'FAST');
      pdf.save(filename);
    } else {
      // Multipage: slice vertically
      const pageHeightPx = pageHeight * pxPerMm;
      let currentPage = 0;
      let yOffset = 0;

      while (yOffset < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset);
        
        // Create slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        const sliceHeightMM = sliceHeight / pxPerMm;

        // Add to PDF
        if (currentPage > 0) pdf.addPage();
        pdf.addImage(sliceImgData, 'PNG', 0, 0, pageWidth, Math.min(sliceHeightMM, pageHeight), undefined, 'FAST');

        yOffset += sliceHeight;
        currentPage++;
      }

      pdf.save(filename);
    }
  } finally {
    // Clean up
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
};

export default exportPreviewAsPdf;

// Helpers
function waitForImages(container: Element): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  
  if (imgs.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let loadedCount = 0;
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === imgs.length) {
        resolve();
      }
    };

    imgs.forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.addEventListener('load', checkComplete, { once: true });
        img.addEventListener('error', checkComplete, { once: true });
      }
    });
  });
}
