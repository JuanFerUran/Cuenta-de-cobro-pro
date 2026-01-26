
import { MyData, BankData, InvoiceDetails, ClientData } from './types';

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
