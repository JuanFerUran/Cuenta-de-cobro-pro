
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
  let currentY = 10;

  // 1. Top color bar
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, 210, 2, 'F');
  currentY = 10;

  // 2. Header section - left side (emisor)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre.toUpperCase(), 20, currentY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(myData.documento, 20, currentY + 6);
  
  // 3. Header section - right side (título y número)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleText = `${branding.documentTitle} ${branding.documentSubtitle}`.toUpperCase();
  doc.text(titleText, 190, currentY, { align: 'right' });
  
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(150, currentY + 5, 40, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`No. ${invoiceDetails.numero}`, 170, currentY + 9.5, { align: 'center' });
  
  // Dates
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emisión: ${invoiceDetails.fechaEmision}`, 190, currentY + 15, { align: 'right' });
  
  currentY += 25;

  // 4. Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tel: ${myData.telefono}`, 20, currentY);
  doc.text(`${myData.direccion}`, 20, currentY + 5);
  
  currentY += 15;

  // 5. Client and Total section (2 columns)
  // Left: Client info
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(20, currentY, 80, 20);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PAGADOR / CLIENTE', 25, currentY + 3);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(clientData.nombre || 'Nombre del cliente', 25, currentY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIT/CC: ${clientData.nit || '---'}`, 25, currentY + 16);

  // Right: Total
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(105, currentY, 95, 20, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NETO A PAGAR', 190, currentY + 3, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(invoiceDetails.valor), 190, currentY + 13, { align: 'right' });
  
  currentY += 28;

  // 6. Service description table
  // Header
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(20, currentY, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL SERVICIO PRESTADO', 25, currentY + 4.5);
  
  currentY += 7;
  
  // Body
  doc.setLineWidth(0.3);
  doc.setDrawColor(220, 220, 220);
  doc.rect(20, currentY, 170, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const splitConcept = doc.splitTextToSize(invoiceDetails.concepto || 'Pendiente por definir descripción.', 160);
  doc.text(splitConcept, 25, currentY + 5);
  
  currentY += 48;

  // 7. Payment and signature section
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(20, currentY, 190, currentY);
  currentY += 5;

  // Payment info - Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('DATOS PARA EL PAGO', 20, currentY);
  
  currentY += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(20, currentY, 80, 18);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(bankData.banco, 25, currentY + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cuenta ${bankData.tipo}:`, 25, currentY + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(bankData.numero, 25, currentY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titular: ${bankData.titular}`, 25, currentY + 16);

  // Signature - Right
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(105, currentY + 10, 140, currentY + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(myData.nombre, 185, currentY + 13, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma Digitalizada', 185, currentY + 16, { align: 'right' });

  currentY += 25;

  // 8. Footer text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  const footerLines = doc.splitTextToSize(branding.footerText, 140);
  doc.text(footerLines, 105, currentY, { align: 'center' });
  
  currentY += footerLines.length * 3 + 2;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(`Generado por ${myData.nombre}`, 105, currentY, { align: 'center' });

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
