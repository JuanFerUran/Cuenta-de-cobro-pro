
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

  const width = 210;
  const mx = 15;
  const cw = width - (mx * 2);

  // ========== TOP BAR ==========
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, width, 6, 'F');

  // ========== HEADER ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(myData.nombre.toUpperCase(), mx, 15);

  // Title right
  doc.setFontSize(11);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(branding.documentTitle.toUpperCase(), width - mx, 15, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(branding.documentSubtitle.toUpperCase(), width - mx, 20, { align: 'right' });

  // Number badge
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(width - mx - 48, 22, 48, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, width - mx - 2, 25.5, { align: 'right' });

  // Company info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT: ${myData.documento}`, mx, 32);
  doc.text(`Tel: ${myData.telefono}`, mx, 37);
  doc.text(`${myData.direccion}`, mx, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`EMISIÓN: ${invoiceDetails.fechaEmision}`, width - mx, 32, { align: 'right' });

  // ========== SEPARATOR ==========
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.setLineWidth(0.4);
  doc.line(mx, 47, width - mx, 47);

  // ========== CLIENT & TOTAL (2 COLS) ==========
  const col = (cw / 2) - 2.5;

  // Client box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(mx, 52, col, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('CLIENTE / PAGADOR', mx + 3, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const nameLines = doc.splitTextToSize(clientData.nombre || 'Cliente', col - 6);
  doc.text(nameLines, mx + 3, 61);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT: ${clientData.nit || '---'}`, mx + 3, 68);

  // Total box
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(mx + col + 5, 52, col, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL A PAGAR', mx + col + 8, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(invoiceDetails.valor), mx + col + 8, 64, { align: 'center' });

  // ========== SERVICE SECTION ==========
  // Header
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(mx, 73, cw, 6, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO', mx + 3, 76.5);

  // Content - limited height for overflow handling
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, 80, cw, 40, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 50, 70);
  const conceptLines = doc.splitTextToSize(invoiceDetails.concepto || 'Pendiente descripción', cw - 6);
  
  // Limit to max 7 lines to fit in box
  const maxLines = Math.min(conceptLines.length, 7);
  for (let i = 0; i < maxLines; i++) {
    doc.text(conceptLines[i], mx + 3, 84 + (i * 4));
  }

  // ========== PAYMENT & SIGNATURE ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS DE PAGO', mx, 128);

  // Payment box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(mx, 133, col, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(bankData.banco.toUpperCase(), mx + 3, 136);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tipo: ${bankData.tipo}`, mx + 3, 141);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(bankData.numero, mx + 3, 145);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titular: ${bankData.titular}`, mx + 3, 149);

  // Signature area
  doc.setLineWidth(0.3);
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.line(mx + col + 10, 140, mx + col + 28, 140);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('_________________', width - mx - 20, 140, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Firma', width - mx - 20, 145, { align: 'center' });

  // ========== FOOTER (FIXED POSITION) ==========
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  const footerLines = doc.splitTextToSize(branding.footerText, cw - 10);
  doc.text(footerLines, width / 2, 265, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`Generado por: ${myData.nombre}`, width / 2, 285, { align: 'center' });

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
