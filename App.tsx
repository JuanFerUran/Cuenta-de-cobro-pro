
import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_MY_DATA, 
  DEFAULT_BANK_DATA, 
  DEFAULT_INVOICE_DETAILS, 
  DEFAULT_CLIENT_DATA 
} from './constants';
import { AppState, AppStatus } from './types';
import InvoiceForm from './components/InvoiceForm';
import Preview from './components/Preview';
import { generatePDF, downloadPDF, printPDF } from './services/pdfService';
import { sendEmail } from './services/emailService';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('axyra_invoice_state_v4');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      myData: DEFAULT_MY_DATA,
      clientData: DEFAULT_CLIENT_DATA,
      bankData: DEFAULT_BANK_DATA,
      invoiceDetails: DEFAULT_INVOICE_DETAILS,
      editMyData: false
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
    if (checkEmail && !state.clientData.email) newErrors.push("Falta el email del cliente para el envío.");
    if (checkEmail && state.clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.clientData.email)) {
      newErrors.push("El formato del email es inválido.");
    }
    if (!state.invoiceDetails.concepto || state.invoiceDetails.concepto.length < 5) {
      newErrors.push("El concepto debe ser más descriptivo.");
    }
    if (state.invoiceDetails.valor <= 0) newErrors.push("El valor debe ser mayor a cero.");
    if (!state.bankData.numero) newErrors.push("Falta el número de cuenta.");

    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      setShowToast({ msg: "Completa los campos obligatorios", type: 'error' });
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
    if (window.confirm('¿Deseas reiniciar los datos del cliente?')) {
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
      setShowToast({ msg: "Escribe una descripción breve primero", type: 'info' });
      return;
    }

    if (!process.env.API_KEY) {
      setShowToast({ msg: "API Key no configurada. Revisa Vercel.", type: 'error' });
      return;
    }

    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Eres un experto en facturación colombiana. Reescribe de forma ultra-profesional y formal este concepto de cobro (máximo 20 palabras): "${state.invoiceDetails.concepto}"`,
      });
      
      const text = response.text;
      if (text) {
        handleUpdate('invoiceDetails', { ...state.invoiceDetails, concepto: text.trim() });
        setShowToast({ msg: "¡Concepto profesionalizado!", type: 'success' });
        setTimeout(() => setShowToast(null), 2000);
      }
    } catch (err) {
      console.error("Gemini Error:", err);
      setShowToast({ msg: "Error al conectar con la IA", type: 'error' });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!validate()) return;
    try {
      const doc = await generatePDF(state);
      downloadPDF(doc, state.invoiceDetails.numero);
      setShowToast({ msg: "Documento descargado", type: 'success' });
      setTimeout(() => setShowToast(null), 3000);
    } catch (err) {
      setShowToast({ msg: "Error al generar el PDF", type: 'error' });
    }
  };

  const handlePrint = async () => {
    if (!validate()) return;
    try {
      const doc = await generatePDF(state);
      printPDF(doc);
    } catch (err) {
      setShowToast({ msg: "Error al intentar imprimir", type: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!validate(true)) return;

    setStatus(AppStatus.SENDING);
    try {
      const doc = await generatePDF(state);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      const response = await sendEmail({
        to: state.clientData.email,
        subject: `Cuenta de Cobro ${state.invoiceDetails.numero} - ${state.myData.nombre}`,
        text: `Buen día,\n\nAdjunto envío la cuenta de cobro No. ${state.invoiceDetails.numero}.\n\nCordialmente,\n${state.myData.nombre}`,
        filename: `${state.invoiceDetails.numero}.pdf`,
        pdfBase64
      });

      if (response.success) {
        setStatus(AppStatus.SENT);
        setShowToast({ msg: "Correo enviado al cliente", type: 'success' });
        // Incrementar número de factura para el próximo uso
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
      setTimeout(() => setShowToast(null), 5000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
      {/* Notificaciones */}
      {showToast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border ${
          showToast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-900/30' : 
          showToast.type === 'error' ? 'bg-slate-900 text-rose-400 border-rose-900/30' : 
          'bg-slate-900 text-blue-400 border-blue-900/30'
        }`}>
          <i className={`fas ${showToast.type === 'success' ? 'fa-check-circle' : showToast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle'}`}></i>
          <p className="font-bold text-xs uppercase tracking-widest">{showToast.msg}</p>
        </div>
      )}

      {/* Header Minimalista */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-[150]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <i className="fas fa-bolt-lightning text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              AXYRA <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] tracking-normal">VERSION PRO</span>
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Infraestructura de Pagos CO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <button onClick={handleClear} className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
             <i className="fas fa-arrow-rotate-left"></i> Limpiar Campos
           </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 lg:p-12 flex flex-col lg:flex-row gap-12 max-w-[1600px]">
        {/* Formulario a la izquierda */}
        <div className="w-full lg:w-[45%] xl:w-[40%]">
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

        {/* Preview a la derecha */}
        <div className="w-full lg:w-[55%] xl:w-[60%] order-first lg:order-last">
          <div className="sticky top-28">
            <div className="mb-6 flex items-center justify-between px-4">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Vista previa del documento</h3>
               <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
               </div>
            </div>
            {/* Contenedor del PDF con aspecto de escritorio */}
            <div className="bg-slate-300/50 p-6 lg:p-12 rounded-[3rem] border-8 border-white shadow-2xl shadow-slate-300/50 overflow-auto max-h-[85vh] scrollbar-hide">
              <div className="transform origin-top transition-transform duration-500">
                <Preview state={state} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} AXYRA SOLUTIONS S.A.S | BOGOTÁ, COLOMBIA
        </p>
      </footer>
    </div>
  );
};

export default App;
