
export interface MyData {
  nombre: string;
  documento: string;
  telefono: string;
  direccion: string;
}

export interface ClientData {
  nit: string;
  nombre: string;
  email: string;
}

export interface BankData {
  banco: string;
  tipo: 'Ahorros' | 'Corriente';
  numero: string;
  titular: string;
}

export interface InvoiceDetails {
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  concepto: string;
  valor: number;
  observaciones: string;
}

export interface AppState {
  myData: MyData;
  clientData: ClientData;
  bankData: BankData;
  invoiceDetails: InvoiceDetails;
  editMyData: boolean;
}

export enum AppStatus {
  EDITING = 'Editando',
  READY = 'PDF Listo',
  SENDING = 'Enviando...',
  SENT = 'Enviado con éxito',
  ERROR = 'Error'
}
