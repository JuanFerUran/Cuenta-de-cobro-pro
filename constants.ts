
import { MyData, BankData, InvoiceDetails, ClientData, BrandingConfig } from './types';

export const DEFAULT_BRANDING: BrandingConfig = {
  documentTitle: 'Cuenta de',
  documentSubtitle: 'Cobro',
  primaryColor: '#0f172a',
  accentColor: '#3b82f6',
  footerText: 'Este documento cumple con los requisitos del Art. 774 del código de comercio.',
  logoUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/></svg>',
  logoBackground: '#1e293b',
  columnLayout: 'single',
  subtotalPosition: 'bottom'
};

export const DEFAULT_MY_DATA: MyData = {
  nombre: 'NOMBRE DEL PRESTADOR',
  documento: 'CC o NIT 00.000.000-0',
  telefono: '300 000 0000',
  direccion: 'Calle 123 # 45 - 67, Ciudad'
};

export const DEFAULT_BANK_DATA: BankData = {
  banco: 'NOMBRE DEL BANCO',
  tipo: 'Ahorros',
  numero: '000-000000-00',
  titular: 'NOMBRE DEL TITULAR'
};

export const DEFAULT_CLIENT_DATA: ClientData = {
  nit: '',
  nombre: '',
  email: ''
};

const today = new Date().toISOString().split('T')[0];
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
const dueDate = nextMonth.toISOString().split('T')[0];

export const DEFAULT_INVOICE_DETAILS: InvoiceDetails = {
  numero: `CC-${new Date().getFullYear()}-0001`,
  fechaEmision: today,
  fechaVencimiento: dueDate,
  concepto: '',
  valor: 0,
  observaciones: ''
};

export const COLORS = {
  primary: '#0f172a', // Slate 900
  accent: '#3b82f6',  // Blue 500
  slate: '#64748b',
  lightBg: '#f8fafc'
};
