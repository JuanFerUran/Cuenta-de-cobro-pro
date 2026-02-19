
import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_MY_DATA, 
  DEFAULT_BANK_DATA, 
  DEFAULT_INVOICE_DETAILS, 
  DEFAULT_CLIENT_DATA,
  DEFAULT_BRANDING
} from './constants';
import { AppState, AppStatus } from './types';
import InvoiceForm from './components/InvoiceForm';
import Preview from './components/Preview';
import ConfigPanel from './components/ConfigPanel';
import { generatePDF, downloadPDF, printPDF } from './services/pdfService';
import { sendEmail } from './services/emailService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('axyra_invoice_state_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Asegurar que branding existe (para compatibilidad con datos antiguos)
      return {
        ...parsed,
        branding: parsed.branding || DEFAULT_BRANDING
      };
    }
    return {
      myData: DEFAULT_MY_DATA,
      clientData: DEFAULT_CLIENT_DATA,
      bankData: DEFAULT_BANK_DATA,
      invoiceDetails: DEFAULT_INVOICE_DETAILS,
      editMyData: false,
      branding: DEFAULT_BRANDING
    };
  });

  const [status, setStatus] = useState<AppStatus>(AppStatus.EDITING);
  const [errors, setErrors] = useState<string[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showToast, setShowToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    localStorage.setItem('axyra_invoice_state_v4', JSON.stringify(state));
  }, [state]);

  const validate = (checkEmail = false): boolean => {
    const newErrors: string[] = [];
    
    if (!state.clientData.nombre) newErrors.push("Falta el nombre del cliente.");
    if (!state.clientData.nit) newErrors.push("Falta el NIT/Cédula del cliente.");
    if (checkEmail && !state.clientData.email) newErrors.push("Falta el email del cliente.");
    if (checkEmail && state.clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.clientData.email)) {
      newErrors.push("Email inválido.");
    }
    if (!state.invoiceDetails.concepto || state.invoiceDetails.concepto.length < 5) {
      newErrors.push("El concepto debe ser más detallado.");
    }
    if (state.invoiceDetails.valor <= 0) newErrors.push("El valor debe ser mayor a 0.");
    if (!state.bankData.numero) newErrors.push("Falta el número de cuenta.");

    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      setShowToast({ msg: "Completa los campos marcados", type: 'error' });
      setTimeout(() => setShowToast(null), 3000);
      return false;
    }
    return true;
  };

  const handleUpdate = (path: keyof AppState, value: any) => {
    setState(prev => ({ ...prev, [path]: value }));
    setStatus(AppStatus.EDITING);
    if (errors.length > 0) setErrors([]); 
  };

  const handleClear = () => {
    if (window.confirm('¿Deseas vaciar los datos del cliente actual?')) {
      setState(prev => ({
        ...prev,
        clientData: DEFAULT_CLIENT_DATA,
        invoiceDetails: { ...DEFAULT_INVOICE_DETAILS, numero: prev.invoiceDetails.numero }
      }));
      setErrors([]);
      setStatus(AppStatus.EDITING);
    }
  };

  const handleGenerateAiConcept = async () => {
    if (!state.invoiceDetails.concepto || state.invoiceDetails.concepto.length < 3) {
      setShowToast({ msg: "Escribe una descripción base primero", type: 'info' });
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: state.invoiceDetails.concepto,
          documentType: 'invoice'
        })
      });

      const data = await response.json();

      if (data.success && data.result) {
        handleUpdate('invoiceDetails', { ...state.invoiceDetails, concepto: data.result.trim() });
        setShowToast({ msg: "✨ Texto optimizado con IA", type: 'success' });
        setTimeout(() => setShowToast(null), 2000);
      } else {
        setShowToast({ msg: data.error || "Error al generar con IA", type: 'error' });
      }
    } catch (err) {
      console.error("Generation error:", err);
      setShowToast({ msg: "Error de conexión. Verifica tu conexión a internet.", type: 'error' });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!validate()) return;
    try {
      // Server-side render to get pixel-perfect PDF
      const res = await fetch('/api/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, url: window.location.origin })
      });
      if (!res.ok) throw new Error('Error al generar PDF en servidor');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${state.invoiceDetails.numero}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setShowToast({ msg: 'PDF descargado', type: 'success' });
      setTimeout(() => setShowToast(null), 2500);
    } catch (err) {
      setShowToast({ msg: "Error al generar PDF", type: 'error' });
    }
  };

  const handlePrint = async () => {
    if (!validate()) return;
    try {
      const res = await fetch('/api/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, url: window.location.origin })
      });
      if (!res.ok) throw new Error('Error al generar PDF en servidor');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setShowToast({ msg: "Error al abrir impresión", type: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!validate(true)) return;

    setStatus(AppStatus.SENDING);
    try {
      // Render PDF on server and send as base64
      const res = await fetch('/api/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, url: window.location.origin })
      });
      if (!res.ok) throw new Error('Error al generar PDF en servidor');
      const arrayBuffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const b64 = bufferToBase64(uint8);

      const response = await sendEmail({
        to: state.clientData.email,
        subject: `Cuenta de Cobro ${state.invoiceDetails.numero} - ${state.myData.nombre}`,
        text: `Buen día,\n\nAdjunto envío la cuenta de cobro No. ${state.invoiceDetails.numero}.\n\nCordialmente,\n${state.myData.nombre}`,
        filename: `${state.invoiceDetails.numero}.pdf`,
        pdfBase64: b64
      });

      if (response.success) {
        setStatus(AppStatus.SENT);
        setShowToast({ msg: "¡Documento enviado al cliente!", type: 'success' });
        const parts = state.invoiceDetails.numero.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2]) + 1;
          const newNum = `${parts[0]}-${parts[1]}-${num.toString().padStart(4, '0')}`;
          handleUpdate('invoiceDetails', { ...state.invoiceDetails, numero: newNum });
        }
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setShowToast({ msg: err.message || "Error al enviar el correo", type: 'error' });
      setStatus(AppStatus.ERROR);
    } finally {
      setTimeout(() => setShowToast(null), 6000);
    }
  };

  // helper to convert Uint8Array to base64
  function bufferToBase64(uint8: Uint8Array) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
      {/* Notificaciones */}
      {showToast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-white/20 backdrop-blur-md ${
          showToast.type === 'success' ? 'bg-slate-900 text-emerald-400' : 
          showToast.type === 'error' ? 'bg-rose-600 text-white' : 
          'bg-blue-600 text-white'
        }`}>
          <i className={`fas ${showToast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
          <p className="font-bold text-sm">{showToast.msg}</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[150] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 p-2 rounded-xl">
            <i className="fas fa-bolt-lightning text-blue-400"></i>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter">AXYRA <span className="text-slate-400 font-medium">PRO</span></h1>
            <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Billing CO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button onClick={handleClear} className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
             <i className="fas fa-sync-alt"></i> Limpiar Campos
           </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 max-w-[1600px]">
        {/* Editor */}
        <div className="w-full lg:w-[42%] xl:w-[38%]">
          <div className="mb-8">
             <h2 className="text-2xl font-black text-slate-900">Editor Profesional</h2>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configuración del documento</p>
          </div>

          <InvoiceForm 
            state={state} 
            onUpdate={handleUpdate} 
            onClear={handleClear}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onSend={handleSendEmail}
            status={status}
            isAiGenerating={isAiGenerating}
            onAiConcept={handleGenerateAiConcept}
            errors={errors}
          />
        </div>

        {/* Previsualización */}
        <div className="w-full lg:w-[58%] xl:w-[62%] order-first lg:order-last">
          <div className="sticky top-24">
            <div className="mb-4 flex items-center justify-between px-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento Final (Vista A4)</span>
               <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
               </div>
            </div>
            
            {/* Efecto Escritorio */}
            <div className="bg-slate-200/50 p-4 lg:p-12 rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden relative">
              <div className="max-h-[75vh] overflow-y-auto scrollbar-hide flex justify-center pb-8">
                <div className="transform origin-top scale-[0.7] md:scale-[0.85] lg:scale-[0.95] xl:scale-100 transition-all duration-500">
                  <Preview state={state} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center border-t border-slate-200">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">
          &copy; AXYRA SOLUTIONS S.A.S | INFRAESTRUCTURA LEGAL
        </p>
      </footer>

      <ConfigPanel 
        config={state.branding}
        onConfigChange={(branding) => handleUpdate('branding', branding)}
      />
    </div>
  );
};

export default App;
