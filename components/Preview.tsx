
import React from 'react';
import { AppState } from '../types';

interface Props {
  state: AppState;
}

const Preview: React.FC<Props> = ({ state }) => {
  const { myData, clientData, bankData, invoiceDetails, branding } = state;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Estilos dinámicos basados en branding
  const accentColorStyle = { color: branding.accentColor };
  const primaryBgStyle = { backgroundColor: branding.primaryColor };
  const logoBackgroundStyle = { backgroundColor: branding.logoBackground };
  const accentBgStyle = { backgroundColor: branding.accentColor };
  const shadowStyle = {
    boxShadow: `0 20px 25px -5px ${branding.accentColor}20`
  };

  return (
    <div className="a4-preview flex flex-col font-sans text-slate-800 bg-white mx-auto overflow-hidden relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-200 rounded-sm">
      {/* Línea Superior con color dinámico */}
      <div className="h-2 w-full" style={accentBgStyle}></div>
      
      <div className="px-12 py-12 flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl" style={logoBackgroundStyle}>
                {branding.logoEmoji}
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none">{myData.nombre}</h2>
                <p className="text-[10px] font-black mt-1 uppercase tracking-widest" style={accentColorStyle}>{myData.documento}</p>
             </div>
          </div>
          <div className="text-[10px] text-slate-500 font-bold space-y-1 tracking-tight">
            <p><i className="fas fa-phone text-slate-300 mr-2"></i> {myData.telefono}</p>
            <p><i className="fas fa-map-marker-alt text-slate-300 mr-2"></i> {myData.direccion}</p>
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-2xl font-black text-slate-900 uppercase italic">
            {branding.documentTitle} <span style={accentColorStyle}>{branding.documentSubtitle}</span>
          </h1>
          <div className="mt-4 inline-block text-white px-5 py-2 rounded-xl font-black text-xs" style={primaryBgStyle}>
            No. {invoiceDetails.numero}
          </div>
          <div className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Emisión: {invoiceDetails.fechaEmision}
          </div>
        </div>
      </div>

      <div className="px-12 grid grid-cols-2 gap-6 mb-10">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <h3 className="text-[9px] font-black text-slate-400 uppercase mb-2">PAGADOR / CLIENTE</h3>
          <p className="text-base font-black text-slate-900 leading-tight">{clientData.nombre || 'Nombre del cliente'}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-bold">NIT/CC: {clientData.nit || '---'}</p>
        </div>
        <div className="p-6 rounded-3xl flex flex-col justify-center items-end text-white" style={{ ...accentBgStyle, ...shadowStyle }}>
           <p className="text-[9px] font-black opacity-80 uppercase mb-1">Total neto a pagar</p>
           <p className="text-3xl font-black tracking-tighter">{formatCurrency(invoiceDetails.valor)}</p>
        </div>
      </div>

      <div className="px-12 flex-1">
        <div className="w-full rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-white text-[9px] font-black uppercase tracking-widest" style={primaryBgStyle}>
                <th className="py-4 px-6">Descripción del Servicio Prestado</th>
                <th className="py-4 px-6 text-right w-40">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-12 px-6 text-[13px] text-slate-700 leading-relaxed font-semibold bg-white">
                  {invoiceDetails.concepto || 'Pendiente por definir descripción.'}
                </td>
                <td className="py-12 px-6 text-right font-black text-xl text-slate-950 bg-slate-50/30">
                  {formatCurrency(invoiceDetails.valor)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-12 pb-12 mt-8">
        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
          <div>
            <h3 className="text-[9px] font-black uppercase mb-4" style={accentColorStyle}>DATOS PARA EL PAGO</h3>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-1 shadow-inner">
              <p className="text-xs font-black text-slate-950 uppercase">{bankData.banco}</p>
              <p className="text-[10px] text-slate-600 font-bold">Cuenta {bankData.tipo}: <span style={accentColorStyle}>{bankData.numero}</span></p>
              <p className="text-[10px] text-slate-500 font-bold">Titular: {bankData.titular}</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-end text-right">
             <div className="mb-6 px-4">
                <div className="w-full h-[1px] bg-slate-200 mb-3"></div>
                <p className="text-[10px] font-black text-slate-950 uppercase">{myData.nombre}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Firma Digitalizada</p>
             </div>
          </div>
        </div>

        <div className="mt-12 text-center opacity-40">
          <p className="text-[8px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight max-w-sm mx-auto">
            {branding.footerText}
          </p>
          <p className="text-[10px] font-black mt-2 uppercase tracking-[0.2em]" style={accentColorStyle}>Generado por {myData.nombre}</p>
