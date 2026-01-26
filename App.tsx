
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
  const [showToast, setShowToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

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
      newErrors.push("El concepto debe ser más descriptivo (mín. 5 caracteres).");
    }
    if (state.invoiceDetails.valor <= 0) newErrors.push("El valor a cobrar debe ser mayor a cero.");
    if (!state.bankData.numero) newErrors.push("Falta el número de cuenta bancaria.");

    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      setShowToast({ msg: "Datos incompletos. Revisa el formulario.", type: 'error' });
      setTimeout(() => setShowToast(null), 4000);
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
    if (window.confirm('¿Deseas resetear los datos del cliente?')) {
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
      setShowToast({ msg: "Escribe una idea corta primero", type: 'error' });
      return;
    }

    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Eres un redactor profesional de cuentas de cobro. Mejora este concepto para que sea formal y directo (máximo 15 palabras). Solo devuelve el texto mejorado: "${state.invoiceDetails.concepto}"`,
      });
      
      if (response.text) {
        handleUpdate('invoiceDetails', { ...state.invoiceDetails, concepto: response.text.trim() });
        setShowToast({ msg: "Texto optimizado con IA", type: 'success' });
        setTimeout(() => setShowToast(null), 2000);
      }
    } catch (err) {
      setShowToast({ msg: "Error con la IA. Revisa tu API Key.", type: 'error' });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!validate()) return;
    try {
      const doc = await generatePDF(state);
      downloadPDF(doc, state.invoiceDetails.numero);
      setShowToast({ msg: "PDF generado y descargado", type: 'success' });
      setTimeout(() => setShowToast(null), 3000);
    } catch (err) {
      setShowToast({ msg: "Error al generar PDF", type: 'error' });
    }
  };

  const handlePrint = async () => {
    if (!validate()) return;
    try {
      const doc = await generatePDF(state);
      printPDF(doc);
    } catch (err) {
      setShowToast({ msg: "Error al abrir impresión", type: 'error' });
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
        setShowToast({ msg: "¡Cuenta enviada al cliente con éxito!", type: 'success' });
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {showToast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border ${
          showToast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'
        }`}>
          <i className={`fas ${showToast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
          <p className="font-bold text-sm tracking-tight">{showToast.msg}</p>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[110] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl shadow-lg shadow-slate-200">
            <i className="fas fa-bolt text-blue-400"></i>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">AXYRA <span className="font-medium text-slate-400">| Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           {status !== AppStatus.EDITING && (
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                status === AppStatus.SENT ? 'bg-emerald-100 text-emerald-700' :
                status === AppStatus.ERROR ? 'bg-rose-100 text-rose-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {status}
              </span>
           )}
           <button onClick={handleClear} className="text-slate-400 hover:text-rose-500 text-xs font-bold uppercase transition-colors">
             <i className="fas fa-sync-alt mr-1"></i> Reiniciar
           </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[45%] order-1">
          <div className="mb-8">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estructura del Cobro</h2>
             <p className="text-slate-500 text-sm">Asegúrate de que todos los campos obligatorios estén llenos.</p>
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
          
          {errors.length > 0 && (
            <div className="mt-6 p-5 bg-rose-50 border border-rose-100 rounded-3xl">
               <h4 className="text-rose-800 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                 <i className="fas fa-triangle-exclamation"></i> Requerido para continuar:
               </h4>
               <ul className="space-y-2">
                 {errors.map((err, i) => (
                   <li key={i} className="text-rose-600 text-[11px] font-bold flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                     {err}
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[55%] order-2">
          <div className="sticky top-24">
            <h2 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-4 px-2">Documento Final (Previsualización)</h2>
            <div className="bg-slate-200 p-4 lg:p-10 rounded-[2.5rem] shadow-inner border-8 border-white overflow-hidden">
              <Preview state={state} />
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        AXYRA SOLUTIONS &copy; {new Date().getFullYear()} | INFRAESTRUCTURA DE PAGOS COLOMBIA
      </footer>
    </div>
  );
};

export default App;
