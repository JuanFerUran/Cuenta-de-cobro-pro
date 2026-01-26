
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
    <div className="space-y-8 pb-40">
      {/* Sección del Emisor */}
      <FormCard title="Mis Datos" icon="fa-fingerprint">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
           <p className="text-[10px] text-slate-400 font-bold leading-tight max-w-[200px]">Estos datos aparecerán en la cabecera del documento.</p>
           <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">Habilitar Edición</span>
            <div className={`relative w-10 h-5 rounded-full transition-colors ${state.editMyData ? 'bg-blue-600' : 'bg-slate-200'}`}>
              <input 
                type="checkbox" 
                className="sr-only"
                checked={state.editMyData}
                onChange={(e) => onUpdate('editMyData', e.target.checked)}
              />
              <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${state.editMyData ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Nombre del Prestador" value={state.myData.nombre} onChange={(v) => handleChange('myData', 'nombre', v)} disabled={!state.editMyData} />
          <Input label="Documento (CC/NIT)" value={state.myData.documento} onChange={(v) => handleChange('myData', 'documento', v)} disabled={!state.editMyData} />
          <Input label="Teléfono" value={state.myData.telefono} onChange={(v) => handleChange('myData', 'telefono', v)} disabled={!state.editMyData} />
          <Input label="Dirección / Ciudad" value={state.myData.direccion} onChange={(v) => handleChange('myData', 'direccion', v)} disabled={!state.editMyData} />
        </div>
      </FormCard>

      {/* Sección del Cliente */}
      <FormCard title="Datos del Cliente" icon="fa-user-tie">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input 
            label="Razón Social / Nombre" 
            placeholder="Nombre del pagador" 
            value={state.clientData.nombre} 
            onChange={(v) => handleChange('clientData', 'nombre', v)}
            error={hasError('nombre del cliente')}
          />
          <Input 
            label="NIT / Cédula" 
            placeholder="00.000.000-0" 
            value={state.clientData.nit} 
            onChange={(v) => handleChange('clientData', 'nit', v)} 
            error={hasError('nit')}
          />
          <div className="md:col-span-2">
            <Input 
              label="Email de Notificación" 
              type="email" 
              placeholder="cliente@ejemplo.com" 
              value={state.clientData.email} 
              onChange={(v) => handleChange('clientData', 'email', v)} 
              error={hasError('email')}
            />
          </div>
        </div>
      </FormCard>

      {/* Sección del Cobro */}
      <FormCard title="Detalles Financieros" icon="fa-coins">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Número de Referencia" value={state.invoiceDetails.numero} onChange={(v) => handleChange('invoiceDetails', 'numero', v)} />
          <Input 
            label="Valor Total (COP)" 
            type="number" 
            value={state.invoiceDetails.valor} 
            onChange={(v) => handleChange('invoiceDetails', 'valor', parseFloat(v) || 0)} 
            error={hasError('valor')}
          />
          
          <div className="md:col-span-2 space-y-3">
             <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Descripción de Servicios</label>
                <button 
                  onClick={onAiConcept}
                  disabled={isAiGenerating}
                  className="group relative overflow-hidden text-[10px] bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  <i className={`fas ${isAiGenerating ? 'fa-spinner fa-spin' : 'fa-magic-wand-sparkles'}`}></i>
                  {isAiGenerating ? 'IA Pensando...' : 'Optimizar con IA'}
                </button>
             </div>
             <textarea 
              className={`w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all h-32 resize-none placeholder:text-slate-300 ${
                hasError('concepto') ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
              // Fix: Changed 'concept' to 'concepto' to match the type definition in types.ts
              value={state.invoiceDetails.concepto}
              onChange={(e) => handleChange('invoiceDetails', 'concepto', e.target.value)}
              placeholder="Describa el servicio prestado..."
             />
          </div>
        </div>
      </FormCard>

      {/* Sección Bancaria */}
      <FormCard title="Método de Pago" icon="fa-university">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Banco" placeholder="Ej: Bancolombia" value={state.bankData.banco} onChange={(v) => handleChange('bankData', 'banco', v)} />
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Cuenta</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none appearance-none cursor-pointer"
              value={state.bankData.tipo}
              onChange={(e) => handleChange('bankData', 'tipo', e.target.value)}
            >
              <option value="Ahorros">Ahorros</option>
              <option value="Corriente">Corriente</option>
            </select>
          </div>
          <Input 
            label="Número de Cuenta" 
            value={state.bankData.numero} 
            onChange={(v) => handleChange('bankData', 'numero', v)} 
            error={hasError('número de cuenta')}
          />
          <Input label="Titular de la Cuenta" value={state.bankData.titular} onChange={(v) => handleChange('bankData', 'titular', v)} />
        </div>
      </FormCard>

      {/* BARRA DE ACCIONES REDISEÑADA (Más delgada y elegante) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] z-[200]">
        <div className="bg-slate-950/90 backdrop-blur-xl p-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-2">
          
          <div className="flex flex-1 items-center gap-1 pl-2">
            <button onClick={onDownload} className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all group relative">
              <i className="fas fa-file-arrow-down text-lg"></i>
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase font-black">PDF</span>
            </button>
            <button onClick={onPrint} className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all group relative">
              <i className="fas fa-print text-lg"></i>
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase font-black">Imprimir</span>
            </button>
          </div>

          <button 
            onClick={onSend}
            disabled={status === AppStatus.SENDING}
            className="flex items-center gap-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.1em] transition-all active:scale-95 shadow-xl shadow-blue-900/20"
          >
            {status === AppStatus.SENDING ? (
              <><i className="fas fa-circle-notch fa-spin"></i> Enviando...</>
            ) : (
              <><i className="fas fa-paper-plane"></i> Enviar al Cliente</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const FormCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div>
        <h3 className="font-black text-slate-900 tracking-tight uppercase text-xs tracking-widest">{title}</h3>
        <div className="h-1 w-6 bg-blue-600 rounded-full mt-1"></div>
      </div>
    </div>
    {children}
  </div>
);

const Input: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string; error?: boolean }> = ({ label, value, onChange, type = 'text', disabled = false, placeholder = '', error = false }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
      {label}
      {error && <span className="text-rose-500 text-[8px] animate-pulse">REQUERIDO</span>}
    </label>
    <input 
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full bg-slate-50 border rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all disabled:opacity-40 disabled:grayscale placeholder:text-slate-300 ${
        error ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default InvoiceForm;
