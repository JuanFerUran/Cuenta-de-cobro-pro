
import { jsPDF } from 'jspdf';
import { AppState } from '../types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val);
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
};

export const generatePDF = async (state: AppState): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { myData, clientData, bankData, invoiceDetails, branding } = state;
  const primaryRGB = hexToRgb(branding.primaryColor);
  const accentRGB = hexToRgb(branding.accentColor);

  // Márgenes
  const marginX = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 0;

  // 1. Top thick color bar
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, pageWidth, 8, 'F');
  currentY = 15;

  // 2. Header: Logo area (left) and Title (right)
  // Logo placeholder
  doc.setFillColor(217, 197, 157); // Beige similar a preview
  doc.roundedRect(marginX, currentY, 15, 15, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 80, 60);
  doc.text('A', marginX + 7.5, currentY + 10, { align: 'center' });

  // Emisor info next to logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre.toUpperCase(), marginX + 20, currentY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(myData.documento, marginX + 20, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(myData.telefono, marginX + 20, currentY + 14);

  // Title on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(branding.documentTitle.toUpperCase(), pageWidth - marginX, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(branding.documentSubtitle.toUpperCase(), pageWidth - marginX, currentY + 8, { align: 'right' });

  // Number box
  doc.setFillColor(217, 197, 157);
  doc.roundedRect(pageWidth - marginX - 50, currentY + 10, 50, 8, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, pageWidth - marginX - 5, currentY + 14.5, { align: 'right' });

  // Emission date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`EMISIÓN: ${invoiceDetails.fechaEmision}`, pageWidth - marginX, currentY + 20, { align: 'right' });

  currentY += 25;

  // 3. Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(myData.direccion, marginX, currentY);

  currentY += 15;

  // 4. Client (left) and Total (right) - 2 boxes with rounded corners
  const colWidth = (contentWidth / 2) - 4;

  // Left: Client box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(marginX, currentY, colWidth, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PAGADOR / CLIENTE', marginX + 4, currentY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const clientNameLines = doc.splitTextToSize(clientData.nombre || 'Nombre del cliente', colWidth - 8);
  doc.text(clientNameLines, marginX + 4, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT/CC: ${clientData.nit || '---'}`, marginX + 4, currentY + 18);

  // Right: Total box with rounded corners
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(marginX + colWidth + 8, currentY, colWidth, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NETO A PAGAR', marginX + colWidth + 12, currentY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(invoiceDetails.valor), marginX + colWidth + 12, currentY + 14, { align: 'center' });

  currentY += 28;

  // 5. Service description section
  // Header with rounded corners
  doc.setFillColor(217, 197, 157);
  doc.roundedRect(marginX, currentY, contentWidth, 6, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO PRESTADO', marginX + 4, currentY + 4);

  currentY += 8;

  // Body - white background with rounded corners
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, 40, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitConcept = doc.splitTextToSize(invoiceDetails.concepto || 'Pendiente por definir descripción.', contentWidth - 8);
  doc.text(splitConcept, marginX + 4, currentY + 5);

  currentY += 44;

  // 6. Payment and signature section
  // Separator
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 6;

  // Left: Payment data
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS PARA EL PAGO', marginX, currentY);

  currentY += 5;

  // Payment box with rounded corners
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(marginX, currentY, colWidth, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(bankData.banco.toUpperCase(), marginX + 4, currentY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cuenta ${bankData.tipo}:`, marginX + 4, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(bankData.numero, marginX + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titular: ${bankData.titular}`, marginX + 4, currentY + 16);

  // Right: Signature area
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX + colWidth + 12, currentY + 8, marginX + colWidth + 32, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre.toUpperCase(), pageWidth - marginX, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma Digitalizada', pageWidth - marginX, currentY + 16, { align: 'right' });

  currentY += 22;

  // 7. Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  const footerLines = doc.splitTextToSize(branding.footerText, contentWidth - 20);
  doc.text(footerLines, pageWidth / 2, currentY, { align: 'center' });

  currentY += (footerLines.length * 2.5) + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`Generado por ${myData.nombre}`, pageWidth / 2, currentY, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}.pdf`);
};

export const printPDF = (doc: jsPDF) => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
