
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

  // 1. Logo removido - documento sin branding

  // 2. Header Bar
  doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);

  // 3. My Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(myData.nombre.toUpperCase(), 20, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(myData.documento, 20, 61);
  doc.text(`Tel: ${myData.telefono}`, 20, 66);
  doc.text(myData.direccion, 20, 71);

  // 4. CC Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`${branding.documentTitle} ${branding.documentSubtitle}`.toUpperCase(), 190, 30, { align: 'right' });
  
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.roundedRect(150, 35, 40, 8, 1, 1, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, 170, 40.5, { align: 'center' });

  // Dates
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`EMISIÓN: ${invoiceDetails.fechaEmision}`, 190, 55, { align: 'right' });
  doc.text(`VENCIMIENTO: ${invoiceDetails.fechaVencimiento}`, 190, 60, { align: 'right' });

  // 5. Client Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 85, 170, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('CLIENTE / DEUDOR:', 25, 91);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(clientData.nombre || 'N/A', 25, 98);
  doc.setFontSize(8);
  doc.text(`NIT/CC: ${clientData.nit || 'N/A'}`, 25, 103);

  // 6. Table
  const tableY = 115;
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(20, tableY, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO', 25, tableY + 5.5);
  doc.text('TOTAL', 185, tableY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const splitConcept = doc.splitTextToSize(invoiceDetails.concepto || "Sin descripción", 130);
  doc.text(splitConcept, 25, tableY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(invoiceDetails.valor), 185, tableY + 18, { align: 'right' });

  // 7. Footer Payment
  const footerY = 220;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, footerY, 190, footerY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS DE PAGO:', 20, footerY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${bankData.banco} - Cuenta de ${bankData.tipo}`, 20, footerY + 16);
  doc.text(`No. de cuenta: ${bankData.numero}`, 20, footerY + 21);
  doc.text(`Titular: ${bankData.titular}`, 20, footerY + 26);

  // Total highlighting
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL A PAGAR:', 190, footerY + 10, { align: 'right' });
  doc.setFontSize(18);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(formatCurrency(invoiceDetails.valor), 190, footerY + 20, { align: 'right' });

  // Legal
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const footerLines = doc.splitTextToSize(branding.footerText, 140);
  doc.text(footerLines, 105, 280, { align: 'center' });

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
