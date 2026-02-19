
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

  const pageWidth = 210;
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  let y = 10;

  // ========== 1. TOP BAR ==========
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // ========== 2. HEADER SECTION ==========
  y = 15;

  // Left: Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(myData.nombre.toUpperCase(), marginX, y);

  // Right: Title + Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(branding.documentTitle.toUpperCase(), pageWidth - marginX, y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(branding.documentSubtitle.toUpperCase(), pageWidth - marginX, y + 6, { align: 'right' });

  // Number badge
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(pageWidth - marginX - 52, y + 9, 52, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, pageWidth - marginX - 1, y + 13.5, { align: 'right' });

  y += 25;

  // Company info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT: ${myData.documento}`, marginX, y);
  doc.text(`Teléfono: ${myData.telefono}`, marginX, y + 5);
  doc.text(`${myData.direccion}`, marginX, y + 10);

  // Emission date right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`EMISIÓN: ${invoiceDetails.fechaEmision}`, pageWidth - marginX, y, { align: 'right' });

  y += 20;

  // ========== 3. SEPARATOR ==========
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 8;

  // ========== 4. CLIENT & TOTAL SECTION ==========
  const colW = (contentWidth / 2) - 3;

  // Client box
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, colW, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('CLIENTE / PAGADOR', marginX + 4, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const clientLines = doc.splitTextToSize(clientData.nombre || 'Cliente', colW - 8);
  doc.text(clientLines, marginX + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT/CC: ${clientData.nit || '---'}`, marginX + 4, y + 16);

  // Total box
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(marginX + colW + 6, y, colW, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL A PAGAR', marginX + colW + 10, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(invoiceDetails.valor), marginX + colW + 10, y + 13, { align: 'center' });

  y += 26;

  // ========== 5. SERVICE SECTION ==========
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(marginX, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO', marginX + 4, y + 5);

  y += 10;

  // Service content area
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(marginX, y, contentWidth, 38, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 50, 70);
  const conceptLines = doc.splitTextToSize(invoiceDetails.concepto || 'Pendiente descripción', contentWidth - 8);
  doc.text(conceptLines, marginX + 4, y + 4);

  y += 42;

  // ========== 6. PAYMENT & SIGNATURE ==========
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS DE PAGO', marginX, y);

  y += 7;

  // Payment info box
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, colW, 17, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(bankData.banco, marginX + 4, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tipo: ${bankData.tipo}`, marginX + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(bankData.numero, marginX + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titular: ${bankData.titular}`, marginX + 4, y + 15);

  // Signature area
  doc.setLineWidth(0.4);
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.line(marginX + colW + 15, y + 8, marginX + colW + 30, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma', marginX + colW + 22, y + 12, { align: 'center' });

  y += 20;

  // ========== 7. FOOTER ==========
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  const footerLines = doc.splitTextToSize(branding.footerText, contentWidth);
  doc.text(footerLines, pageWidth / 2, y, { align: 'center' });

  y += (footerLines.length * 2.5) + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`Generado por: ${myData.nombre}`, pageWidth / 2, y, { align: 'center' });

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
