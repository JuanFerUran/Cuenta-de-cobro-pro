
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
      {/* Tus Datos */}
      <Card title="Tus Datos (Emisor)" icon="fa-user-check">
        <div className="flex justify-end mb-4">
           <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-widest">Editar mis datos fijos</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              checked={state.editMyData}
              onChange={(e) => onUpdate('editMyData', e.target.checked)}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Tu Nombre" value={state.myData.nombre} onChange={(v) => handleChange('myData', 'nombre', v)} disabled={!state.editMyData} />
          <InputField label="Tu Documento" value={state.myData.documento} onChange={(v) => handleChange('myData', 'documento', v)} disabled={!state.editMyData} />
          <InputField label="Tu Teléfono" value={state.myData.telefono} onChange={(v) => handleChange('myData', 'telefono', v)} disabled={!state.editMyData} />
          <InputField label="Tu Dirección" value={state.myData.direccion} onChange={(v) => handleChange('myData', 'direccion', v)} disabled={!state.editMyData} />
        </div>
      </Card>

      {/* Cliente */}
      <Card title="Datos del Cliente" icon="fa-briefcase">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField 
            label="Nombre o Empresa" 
            placeholder="Ej: Inversiones S.A.S" 
            value={state.clientData.nombre} 
            onChange={(v) => handleChange('clientData', 'nombre', v)}
            error={hasError('nombre del cliente')}
          />
          <InputField 
            label="NIT / Cédula" 
            placeholder="900.000.000-1" 
            value={state.clientData.nit} 
            onChange={(v) => handleChange('clientData', 'nit', v)} 
            error={hasError('nit')}
          />
          <div className="md:col-span-2">
            <InputField 
              label="Email de envío" 
              type="email" 
              placeholder="facturacion@empresa.com" 
              value={state.clientData.email} 
              onChange={(v) => handleChange('clientData', 'email', v)} 
              error={hasError('email')}
            />
          </div>
        </div>
      </Card>

      {/* Pago */}
      <Card title="Datos Bancarios" icon="fa-building-columns">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Banco" placeholder="Ej: Bancolombia" value={state.bankData.banco} onChange={(v) => handleChange('bankData', 'banco', v)} />
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cuenta</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
              value={state.bankData.tipo}
              onChange={(e) => handleChange('bankData', 'tipo', e.target.value)}
            >
              <option value="Ahorros">Ahorros</option>
              <option value="Corriente">Corriente</option>
            </select>
          </div>
          <InputField 
            label="Número de Cuenta" 
            value={state.bankData.numero} 
            onChange={(v) => handleChange('bankData', 'numero', v)} 
            error={hasError('número de cuenta')}
          />
          <InputField label="Titular" value={state.bankData.titular} onChange={(v) => handleChange('bankData', 'titular', v)} />
        </div>
      </Card>

      {/* Cobro */}
      <Card title="Detalle del Cobro" icon="fa-file-invoice-dollar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Referencia #" value={state.invoiceDetails.numero} onChange={(v) => handleChange('invoiceDetails', 'numero', v)} />
          <InputField 
            label="Valor COP" 
            type="number" 
            value={state.invoiceDetails.valor} 
            onChange={(v) => handleChange('invoiceDetails', 'valor', parseFloat(v) || 0)} 
            error={hasError('valor')}
          />
          
          <div className="md:col-span-2 space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción del Servicio</label>
                <button 
                  onClick={onAiConcept}
                  disabled={isAiGenerating}
                  className="text-[9px] bg-slate-900 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <i className={`fas ${isAiGenerating ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                  {isAiGenerating ? 'Mejorando...' : 'Optimizar con IA'}
                </button>
             </div>
             <textarea 
              className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all h-28 resize-none placeholder:text-slate-300 ${
                hasError('concepto') ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-200'
              }`}
              value={state.invoiceDetails.concepto}
              onChange={(e) => handleChange('invoiceDetails', 'concepto', e.target.value)}
              placeholder="Ej: Desarrollo de plataforma web durante el mes de Octubre..."
             />
          </div>
        </div>
      </Card>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] md:w-max bg-slate-900 px-6 py-4 rounded-[2.5rem] shadow-2xl flex flex-wrap items-center justify-center gap-4 z-[120] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
           <ActionButton label="Descargar" icon="fa-download" color="bg-white/10 hover:bg-white/20 text-white" onClick={onDownload} />
           <ActionButton label="Imprimir" icon="fa-print" color="bg-white/10 hover:bg-white/20 text-white" onClick={onPrint} />
        </div>
        <div className="hidden md:block w-[1px] h-8 bg-white/10 mx-1"></div>
        <button 
          onClick={onSend}
          disabled={status === AppStatus.SENDING}
          className="flex items-center gap-3 bg-blue-500 hover:bg-blue-400 text-slate-950 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter transition-all active:scale-95 disabled:opacity-50"
        >
          <i className={`fas ${status === AppStatus.SENDING ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`}></i>
          {status === AppStatus.SENDING ? 'Procesando...' : 'Enviar al Cliente'}
        </button>
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:border-slate-300 transition-all group">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
        <i className={`fas ${icon}`}></i>
      </div>
      <h3 className="font-black text-slate-900 tracking-tight uppercase text-[11px] tracking-widest">{title}</h3>
    </div>
    {children}
  </div>
);

const InputField: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string; error?: boolean }> = ({ label, value, onChange, type = 'text', disabled = false, placeholder = '', error = false }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
      {label}
      {error && <span className="text-rose-500 animate-pulse"><i className="fas fa-asterisk"></i></span>}
    </label>
    <input 
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100 placeholder:text-slate-300 ${
        error ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-200'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const ActionButton: React.FC<{ label: string; icon: string; color: string; onClick: () => void }> = ({ label, icon, color, onClick }) => (
  <button onClick={onClick} className={`${color} flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95`}>
    <i className={`fas ${icon}`}></i>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default InvoiceForm;
