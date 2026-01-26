
import React from 'react';
import { AppState } from '../types';
import { COLORS } from '../constants';

interface Props {
  state: AppState;
}

const Preview: React.FC<Props> = ({ state }) => {
  const { myData, clientData, bankData, invoiceDetails } = state;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="a4-preview flex flex-col font-sans text-slate-800 shadow-2xl bg-white mx-auto overflow-hidden">
      {/* Header Accent */}
      <div className="h-2 w-full bg-blue-600 mb-10"></div>
      
      <div className="px-10 flex justify-between items-start mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <i className="fas fa-file-invoice text-2xl"></i>
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">{myData.nombre}</h2>
                <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-widest">{myData.documento}</p>
             </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium space-y-0.5 ml-1">
            <p><i className="fas fa-phone mr-2 text-slate-300"></i> {myData.telefono}</p>
            <p><i className="fas fa-location-dot mr-2 text-slate-300"></i> {myData.direccion}</p>
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 leading-tight">CUENTA DE<br/><span className="text-blue-600">COBRO</span></h1>
          <div className="mt-4 inline-block bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-sm tracking-widest uppercase">
            No. {invoiceDetails.numero}
          </div>
          <div className="mt-4 text-[10px] font-bold text-slate-400 space-y-1">
            <p>FECHA EMISIÓN: <span className="text-slate-900">{invoiceDetails.fechaEmision}</span></p>
            <p>FECHA VENCIMIENTO: <span className="text-slate-900">{invoiceDetails.fechaVencimiento}</span></p>
          </div>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="px-10 grid grid-cols-2 gap-8 mb-12">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">CLIENTE / DEUDOR</h3>
          <p className="text-md font-bold text-slate-900">{clientData.nombre || 'Sin nombre definido'}</p>
          <p className="text-xs text-slate-500 mt-1">NIT/CC: {clientData.nit || '---'}</p>
        </div>
        <div className="bg-blue-600 p-6 rounded-2xl flex flex-col justify-center items-end text-white shadow-lg shadow-blue-100">
           <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Total a Pagar</p>
           <p className="text-3xl font-black">{formatCurrency(invoiceDetails.valor)}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-10 flex-1">
        <div className="w-full rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                <th className="py-4 px-6">Descripción del Servicio</th>
                <th className="py-4 px-6 text-right w-40">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-8 px-6 text-sm text-slate-700 leading-relaxed align-top">
                  {invoiceDetails.concepto || 'Pendiente por definir concepto...'}
                </td>
                <td className="py-8 px-6 text-right font-black text-lg text-slate-900 align-top">
                  {formatCurrency(invoiceDetails.valor)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment & Legal */}
      <div className="px-10 mt-12 mb-10">
        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
          <div>
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">MÉTODO DE PAGO</h3>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold text-slate-900">{bankData.banco || 'BANCO'}</p>
              <p className="text-xs text-slate-600 mt-1">Cuenta de {bankData.tipo}: <span className="font-bold text-blue-600">{bankData.numero || '---'}</span></p>
              <p className="text-xs text-slate-500 mt-1">Titular: {bankData.titular}</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-end text-right">
             <div className="mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">FIRMA AUTORIZADA</h3>
                <div className="w-full h-12 border-b border-slate-200"></div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">{myData.nombre}</p>
             </div>
          </div>
        </div>

        <div className="mt-12 space-y-3">
          <p className="text-[8px] text-slate-400 text-center leading-relaxed max-w-lg mx-auto uppercase font-medium">
            Esta cuenta de cobro se asimila en sus efectos legales a una factura de venta (Artículo 774 del Código de Comercio). Favor realizar el pago antes de la fecha de vencimiento.
          </p>
          <div className="h-0.5 w-12 bg-blue-100 mx-auto rounded-full"></div>
          <p className="text-[10px] font-black text-blue-600 text-center uppercase tracking-[0.2em]">¡Gracias por tu confianza!</p>
        </div>
      </div>
    </div>
  );
};

export default Preview;
