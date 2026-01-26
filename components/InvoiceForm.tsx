
import React from 'react';
import { AppState, AppStatus } from '../types';

interface Props {
  state: AppState;
  onUpdate: (path: keyof AppState, value: any) => void;
  onClear: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onSend: () => void;
  onAiConcept: () => void;
  status: AppStatus;
  isAiGenerating: boolean;
  errors: string[];
}

const InvoiceForm: React.FC<Props> = ({ state, onUpdate, onClear, onDownload, onPrint, onSend, onAiConcept, status, isAiGenerating, errors }) => {
  const handleChange = (section: keyof AppState, field: string, value: any) => {
    onUpdate(section, { ...(state[section] as object), [field]: value });
  };

  const hasError = (keyword: string) => errors.some(e => e.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <div className="space-y-6 pb-28">
      <FormCard title="Emisor (Tus Datos)" icon="fa-fingerprint">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
           <p className="text-[9px] text-slate-400 font-bold uppercase">Datos de facturación fijos</p>
           <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[9px] font-black text-slate-400 uppercase">Editar</span>
            <div className={`relative w-8 h-4 rounded-full transition-colors ${state.editMyData ? 'bg-blue-600' : 'bg-slate-200'}`}>
              <input type="checkbox" className="sr-only" checked={state.editMyData} onChange={(e) => onUpdate('editMyData', e.target.checked)} />
              <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${state.editMyData ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Tu Nombre" value={state.myData.nombre} onChange={(v) => handleChange('myData', 'nombre', v)} disabled={!state.editMyData} />
          <Input label="Tu Documento" value={state.myData.documento} onChange={(v) => handleChange('myData', 'documento', v)} disabled={!state.editMyData} />
          <Input label="Tu Teléfono" value={state.myData.telefono} onChange={(v) => handleChange('myData', 'telefono', v)} disabled={!state.editMyData} />
          <Input label="Tu Dirección" value={state.myData.direccion} onChange={(v) => handleChange('myData', 'direccion', v)} disabled={!state.editMyData} />
        </div>
      </FormCard>

      <FormCard title="Cliente / Deudor" icon="fa-user-tie">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre o Empresa" value={state.clientData.nombre} onChange={(v) => handleChange('clientData', 'nombre', v)} error={hasError('nombre del cliente')} />
          <Input label="NIT / Cédula" value={state.clientData.nit} onChange={(v) => handleChange('clientData', 'nit', v)} error={hasError('nit')} />
          <div className="md:col-span-2">
            <Input label="Email de Notificación" type="email" value={state.clientData.email} onChange={(v) => handleChange('clientData', 'email', v)} error={hasError('email')} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Detalles del Cobro" icon="fa-coins">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Referencia #" value={state.invoiceDetails.numero} onChange={(v) => handleChange('invoiceDetails', 'numero', v)} />
          <Input label="Valor Total (COP)" type="number" value={state.invoiceDetails.valor} onChange={(v) => handleChange('invoiceDetails', 'valor', parseFloat(v) || 0)} error={hasError('valor')} />
          <div className="md:col-span-2 space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción de Servicios</label>
                <button onClick={onAiConcept} disabled={isAiGenerating} className="bg-slate-900 text-white text-[9px] px-3 py-1.5 rounded-lg font-black uppercase flex items-center gap-2 hover:bg-blue-600 transition-all">
                  <i className={`fas ${isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-sparkles'}`}></i>
                  {isAiGenerating ? 'Generando...' : 'IA Optimizar'}
                </button>
             </div>
             <textarea className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 outline-none transition-all h-24 resize-none ${hasError('concepto') ? 'border-rose-300' : 'border-slate-200'}`} value={state.invoiceDetails.concepto} onChange={(e) => handleChange('invoiceDetails', 'concepto', e.target.value)} placeholder="Ej: Desarrollo de software..." />
          </div>
        </div>
      </FormCard>

      <FormCard title="Datos Bancarios" icon="fa-university">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Banco" value={state.bankData.banco} onChange={(v) => handleChange('bankData', 'banco', v)} />
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo Cuenta</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-600 outline-none" value={state.bankData.tipo} onChange={(e) => handleChange('bankData', 'tipo', e.target.value)}>
              <option value="Ahorros">Ahorros</option>
              <option value="Corriente">Corriente</option>
            </select>
          </div>
          <Input label="Nº Cuenta" value={state.bankData.numero} onChange={(v) => handleChange('bankData', 'numero', v)} error={hasError('número de cuenta')} />
          <Input label="Titular" value={state.bankData.titular} onChange={(v) => handleChange('bankData', 'titular', v)} />
        </div>
      </FormCard>

      {/* BARRA FLOTANTE REDISEÑADA (Slim Glass) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[500px] z-[200]">
        <div className="bg-slate-950/90 backdrop-blur-xl p-1.5 rounded-full shadow-2xl border border-white/10 flex items-center justify-between">
          <div className="flex gap-1 pl-2">
            <ActionButton onClick={onDownload} icon="fa-download" label="PDF" />
            <ActionButton onClick={onPrint} icon="fa-print" label="Imprimir" />
          </div>

          <button onClick={onSend} disabled={status === AppStatus.SENDING} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
            {status === AppStatus.SENDING ? (
              <><i className="fas fa-circle-notch fa-spin"></i> Enviando</>
            ) : (
              <><i className="fas fa-paper-plane"></i> Enviar al Cliente</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: () => void; icon: string; label: string }> = ({ onClick, icon, label }) => (
  <button onClick={onClick} className="group flex flex-col items-center justify-center w-10 h-10 text-white hover:bg-white/10 rounded-full transition-all">
    <i className={`fas ${icon} text-base`}></i>
    <span className="text-[6px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">{label}</span>
  </button>
);

const FormCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
        <i className={`fas ${icon} text-xs`}></i>
      </div>
      <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{title}</h3>
    </div>
    {children}
  </div>
);

const Input: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string; error?: boolean }> = ({ label, value, onChange, type = 'text', disabled = false, placeholder = '', error = false }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} disabled={disabled} placeholder={placeholder} className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 outline-none transition-all ${error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'}`} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export default InvoiceForm;
