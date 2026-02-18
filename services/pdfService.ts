
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
  const marginY = 5;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = marginY;

  // 1. Top color bar
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');
  currentY = 10;

  // 2. Header: Left side (emisor info) + Right side (título)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre.toUpperCase(), marginX, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(myData.documento, marginX, currentY + 6);

  // Right side: Title
  const titleText = `${branding.documentTitle.toUpperCase()} ${branding.documentSubtitle.toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(titleText, pageWidth - marginX, currentY + 2, { align: 'right' });

  // Number box
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(pageWidth - marginX - 45, currentY + 8, 45, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, pageWidth - marginX - 2, currentY + 12, { align: 'right' });

  // Emission date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emisión: ${invoiceDetails.fechaEmision}`, pageWidth - marginX, currentY + 17, { align: 'right' });

  currentY += 25;

  // 3. Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tel: ${myData.telefono}`, marginX, currentY);
  doc.text(`${myData.direccion}`, marginX, currentY + 5);

  currentY += 12;

  // 4. Client (left) and Total (right) - 2 columns
  const colWidth = (contentWidth / 2) - 3;

  // Left: Client box - solo fondo gris claro, sin borde
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, colWidth, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PAGADOR / CLIENTE', marginX + 3, currentY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const clientName = doc.splitTextToSize(clientData.nombre || 'Nombre del cliente', colWidth - 6);
  doc.text(clientName, marginX + 3, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT/CC: ${clientData.nit || '---'}`, marginX + 3, currentY + 14);

  // Right: Total box
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(marginX + colWidth + 6, currentY, colWidth, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NETO A PAGAR', marginX + colWidth + 9, currentY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(invoiceDetails.valor), marginX + colWidth + 9, currentY + 12, { align: 'center' });

  currentY += 22;

  // 5. Service description table
  // Header
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO PRESTADO', marginX + 3, currentY + 4);

  currentY += 6;

  // Body - sin borde
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, contentWidth, 35, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitConcept = doc.splitTextToSize(invoiceDetails.concepto || 'Pendiente por definir descripción.', contentWidth - 6);
  doc.text(splitConcept, marginX + 3, currentY + 4);

  currentY += 39;

  // 6. Payment data (left) and signature (right)
  // Separator line
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 5;

  // Left: Payment data
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS PARA EL PAGO', marginX, currentY);

  currentY += 4;

  // Payment box - solo fondo, sin borde
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, currentY, colWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(bankData.banco.toUpperCase(), marginX + 3, currentY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cuenta ${bankData.tipo}:`, marginX + 3, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(bankData.numero, marginX + 3, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titular: ${bankData.titular}`, marginX + 3, currentY + 14);

  // Right: Signature
  // Signature line
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX + colWidth + 10, currentY + 8, marginX + colWidth + 30, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre.toUpperCase(), pageWidth - marginX, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma Digitalizada', pageWidth - marginX, currentY + 15, { align: 'right' });

  currentY += 20;

  // 7. Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  const footerLines = doc.splitTextToSize(branding.footerText, contentWidth - 20);
  doc.text(footerLines, pageWidth / 2, currentY, { align: 'center' });

  currentY += (footerLines.length * 2.5) + 2;

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
