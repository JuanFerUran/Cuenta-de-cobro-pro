
import React from 'react';
import { AppState } from '../types';

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
    <div className="a4-preview flex flex-col font-sans text-slate-800 shadow-2xl bg-white mx-auto overflow-hidden relative border border-slate-100">
      {/* Línea de acento superior */}
      <div className="h-3 w-full bg-blue-600"></div>
      
      <div className="px-12 py-12 flex justify-between items-start">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <i className="fas fa-file-invoice text-3xl"></i>
             </div>
             <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-950 leading-none">{myData.nombre}</h2>
                <p className="text-[11px] font-black text-blue-600 mt-2 uppercase tracking-[0.2em]">{myData.documento}</p>
             </div>
          </div>
          <div className="text-xs text-slate-500 font-bold space-y-1.5 ml-1">
            <p className="flex items-center gap-3"><i className="fas fa-phone text-slate-300 w-4"></i> {myData.telefono}</p>
            <p className="flex items-center gap-3"><i className="fas fa-map-marker-alt text-slate-300 w-4"></i> {myData.direccion}</p>
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter">CUENTA DE<br/><span className="text-blue-600">COBRO</span></h1>
          <div className="mt-6 inline-flex flex-col items-end">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Referencia única</span>
             <div className="bg-slate-950 text-white px-6 py-2.5 rounded-xl font-black text-sm tracking-widest">
               No. {invoiceDetails.numero}
             </div>
          </div>
        </div>
      </div>

      {/* Grid de Información Principal */}
      <div className="px-12 grid grid-cols-2 gap-8 mb-12">
        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">CLIENTE / RECEPTOR</h3>
          <p className="text-lg font-black text-slate-900 leading-tight">{clientData.nombre || 'Nombre del cliente no definido'}</p>
          <p className="text-xs text-slate-500 mt-2 font-bold tracking-wider">NIT/CC: {clientData.nit || '---'}</p>
        </div>
        <div className="bg-blue-600 p-8 rounded-[2rem] flex flex-col justify-center items-end text-white shadow-2xl shadow-blue-200">
           <p className="text-[10px] font-black opacity-80 uppercase tracking-[0.3em] mb-2">Total neto a pagar</p>
           <p className="text-4xl font-black tracking-tighter">{formatCurrency(invoiceDetails.valor)}</p>
        </div>
      </div>

      {/* Cuerpo del Documento */}
      <div className="px-12 flex-1">
        <div className="w-full rounded-[2rem] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.3em]">
                <th className="py-5 px-8">Descripción detallada de la prestación</th>
                <th className="py-5 px-8 text-right w-48">Total COP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-12 px-8 text-[15px] text-slate-700 leading-relaxed font-medium align-top">
                  {invoiceDetails.concepto || 'Pendiente por definir descripción de servicios...'}
                </td>
                <td className="py-12 px-8 text-right font-black text-2xl text-slate-950 align-top">
                  {formatCurrency(invoiceDetails.valor)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pie de Página: Pago y Firma */}
      <div className="px-12 mt-12 pb-12">
        <div className="grid grid-cols-2 gap-16 pt-10 border-t-2 border-slate-50">
          <div>
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-5">INSTRUCCIONES DE PAGO</h3>
            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 space-y-1">
              <p className="text-sm font-black text-slate-950 uppercase">{bankData.banco || 'ENTIDAD BANCARIA'}</p>
              <p className="text-xs text-slate-600 font-bold">Cuenta de {bankData.tipo}: <span className="text-blue-600 font-black">{bankData.numero || 'XXXX-XXXX-XX'}</span></p>
              <p className="text-[11px] text-slate-500 font-bold">Titular: {bankData.titular}</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-end text-right">
             <div className="mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">FIRMA DE CONFORMIDAD</h3>
                <div className="w-full h-[1px] bg-slate-200"></div>
                <p className="text-[10px] font-black text-slate-950 mt-4 uppercase tracking-widest">{myData.nombre}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">PRESTADOR DEL SERVICIO</p>
             </div>
          </div>
        </div>

        <div className="mt-16 space-y-4">
          <p className="text-[9px] text-slate-400 text-center leading-relaxed max-w-lg mx-auto uppercase font-bold tracking-tighter opacity-70">
            Esta cuenta de cobro cumple con los requisitos legales del Art. 774 del código de comercio. Por favor, realice su abono antes de la fecha de corte establecida.
          </p>
          <div className="h-1 w-12 bg-blue-100 mx-auto rounded-full"></div>
          <p className="text-xs font-black text-blue-600 text-center uppercase tracking-[0.4em]">Axyra Solutions</p>
        </div>
      </div>
    </div>
  );
};

export default Preview;
