import { AppState } from '../types';

/**
 * Build a self-contained HTML string for the invoice PDF.
 * No external resources — everything inlined for reliable server rendering.
 */
export function buildInvoiceHtml(data: AppState): string {
  const { myData, clientData, bankData, invoiceDetails, branding } = data;

  const formatCurrency = (val: number): string =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00-05:00');
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(d);
  };

  const accentColorStyle = `color:${branding.accentColor}`;
  const primaryBgStyle = `background-color:${branding.primaryColor}`;
  const logoBgStyle = `background-color:${branding.logoBackground}`;
  const accentBgStyle = `background-color:${branding.accentColor}`;
  const shadowStyle = `box-shadow:0 20px 25px -5px ${branding.accentColor}33`;

  const safeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const hasObservaciones = invoiceDetails.observaciones && invoiceDetails.observaciones.trim().length > 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 portrait; margin: 0; padding: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .a4 {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .accent-line { height: 8px; width: 100%; }
    .px-12 { padding-left: 3rem; padding-right: 3rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mt-8 { margin-top: 2rem; }
    .mt-12 { margin-top: 3rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .pb-12 { padding-bottom: 3rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-1 { flex: 1; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .justify-center { justify-content: center; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .gap-12 { gap: 3rem; }
    .gap-6 { gap: 1.5rem; }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .font-black { font-weight: 900; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .uppercase { text-transform: uppercase; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .tracking-[0.2em] { letter-spacing: 0.2em; }
    .leading-none { line-height: 1; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-base { font-size: 1rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .text-\[8px\] { font-size: 8px; }
    .text-\[9px\] { font-size: 9px; }
    .text-\[10px\] { font-size: 10px; }
    .text-\[11px\] { font-size: 11px; }
    .text-\[13px\] { font-size: 13px; }
    .opacity-40 { opacity: 0.4; }
    .rounded-2xl { border-radius: 0.75rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .rounded-sm { border-radius: 0.125rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .border { border: 1px solid; }
    .border-t { border-top: 1px solid; }
    .border-slate-100 { border-color: #f1f5f9; }
    .border-slate-200 { border-color: #e2e8f0; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-white { background-color: #ffffff; }
    .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem 1.5rem; text-align: left; }
    th { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 900; }
    td { font-size: 0.8125rem; }
    img { max-width: 100%; height: auto; display: block; }
    .h-\[1px\] { height: 1px; }
    .w-14 { width: 3.5rem; }
    .w-16 { width: 4rem; }
    .w-40 { width: 10rem; }
  </style>
</head>
<body>
  <div class="a4">
    <div class="accent-line" style="${accentBgStyle}"></div>
    <div class="px-12 py-12 flex justify-between items-start">
      <div class="flex-col gap-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg p-1.5" style="${logoBgStyle}">
            <img src="${safeHtml(branding.logoUrl)}" alt="Logo" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none'" />
          </div>
          <div>
            <h2 style="font-size:1.25rem;font-weight:900;text-transform:uppercase;letter-spacing:-0.025em;color:#0f172a;line-height:1;">${safeHtml(myData.nombre)}</h2>
            <p style="font-size:10px;font-weight:900;margin-top:4px;text-transform:uppercase;letter-spacing:0.1em;" class="${accentColorStyle}">${safeHtml(myData.documento)}</p>
          </div>
        </div>
        <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:-0.025em;line-height:1.5;">
          <p><span style="color:#cbd5e1;">&#xf095;</span> ${safeHtml(myData.telefono)}</p>
          <p style="margin-top:2px;"><span style="color:#cbd5e1;">&#xf3c5;</span> ${safeHtml(myData.direccion)}</p>
        </div>
      </div>
      <div class="text-right">
        <h1 style="font-size:1.5rem;font-weight:900;color:#0f172a;text-transform:uppercase;font-style:italic;letter-spacing:-0.025em;">
          ${safeHtml(branding.documentTitle)} <span class="${accentColorStyle}">${safeHtml(branding.documentSubtitle)}</span>
        </h1>
        <div style="margin-top:16px;display:inline-block;color:#fff;padding:8px 20px;border-radius:12px;font-weight:900;font-size:0.75rem;" class="${primaryBgStyle}">
          No. ${safeHtml(invoiceDetails.numero)}
        </div>
        <div style="margin-top:16px;font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">
          Emisión: ${formatDate(invoiceDetails.fechaEmision)}
        </div>
        ${invoiceDetails.fechaVencimiento ? `
        <div style="margin-top:4px;font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">
          Vence: ${formatDate(invoiceDetails.fechaVencimiento)}
        </div>` : ''}
      </div>
    </div>

    <div class="px-12 grid grid-cols-2 gap-6 mb-10">
      <div style="background-color:#f8fafc;padding:1.5rem;border-radius:1.5rem;border:1px solid #f1f5f9;">
        <h3 style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">PAGADOR / CLIENTE</h3>
        <p style="font-size:1rem;font-weight:900;color:#0f172a;line-height:1.25;">${safeHtml(clientData.nombre || 'Nombre del cliente')}</p>
        <p style="font-size:10px;color:#64748b;margin-top:4px;font-weight:700;">NIT/CC: ${safeHtml(clientData.nit || '---')}</p>
      </div>
      <div style="padding:1.5rem;border-radius:1.5rem;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;color:#fff;" class="${accentBgStyle}" ${shadowStyle.includes('box-shadow') ? 'style="' + accentBgStyle + ';box-shadow:' + shadowStyle.replace('box-shadow:', '') + '"' : ''}>
        <p style="font-size:9px;font-weight:900;opacity:0.8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Total neto a pagar</p>
        <p style="font-size:1.875rem;font-weight:900;letter-spacing:-0.05em;">${formatCurrency(invoiceDetails.valor)}</p>
      </div>
    </div>

    <div class="px-12 flex-1">
      <div style="width:100%;border-radius:0.75rem;border:1px solid #f1f5f9;overflow:hidden;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);">
        <table>
          <thead>
            <tr style="color:#fff;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;" class="${primaryBgStyle}">
              <th>Descripción del Servicio Prestado</th>
              ${branding.subtotalPosition === 'side' ? '<th style="text-align:right;width:10rem;">Subtotal</th>' : ''}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:3rem 1.5rem;font-size:13px;color:#334155;line-height:1.625;font-weight:600;background:#fff;">
                ${safeHtml(invoiceDetails.concepto || 'Pendiente por definir descripción.')}
              </td>
              ${branding.subtotalPosition === 'side' ? `<td style="padding:3rem 1.5rem;text-align:right;font-weight:900;font-size:1.25rem;color:#0f172a;background:#f8fafc33;">${formatCurrency(invoiceDetails.valor)}</td>` : ''}
            </tr>
            ${branding.subtotalPosition === 'bottom' ? `
            <tr>
              <td colspan="2" style="padding:1.5rem;text-align:right;font-weight:900;font-size:1.25rem;color:#0f172a;background:#f8fafc33;border-top:1px solid #f1f5f9;">
                Subtotal: ${formatCurrency(invoiceDetails.valor)}
              </td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>

      ${hasObservaciones ? `
      <div style="margin-top:1.5rem;padding-left:0.5rem;">
        <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Observaciones</p>
        <p style="font-size:11px;color:#475569;line-height:1.625;background:#f8fafc;padding:1rem;border-radius:0.75rem;border:1px solid #f1f5f9;">
          ${safeHtml(invoiceDetails.observaciones)}
        </p>
      </div>` : ''}
    </div>

    <div class="px-12 pb-12 mt-8">
      <div class="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
        <div>
          <h3 style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;" class="${accentColorStyle}">DATOS PARA EL PAGO</h3>
          <div style="background:#f8fafc;padding:1.25rem;border-radius:1rem;border:1px solid #f1f5f9;line-height:1.75;box-shadow:inset 0 2px 4px 0 rgba(0,0,0,0.05);">
            <p style="font-size:0.875rem;font-weight:900;color:#0f172a;text-transform:uppercase;">${safeHtml(bankData.banco)}</p>
            <p style="font-size:10px;color:#475569;font-weight:700;">Cuenta ${safeHtml(bankData.tipo)}: <span class="${accentColorStyle}">${safeHtml(bankData.numero)}</span></p>
            <p style="font-size:10px;color:#64748b;font-weight:700;">Titular: ${safeHtml(bankData.titular)}</p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:flex-end;text-align:right;">
          <div style="margin-bottom:1.5rem;padding:1rem;">
            <div style="width:100%;height:1px;background:#e2e8f0;margin-bottom:12px;"></div>
            <p style="font-size:10px;font-weight:900;color:#0f172a;text-transform:uppercase;">${safeHtml(myData.nombre)}</p>
            <p style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:-0.05em;">Firma Digitalizada</p>
          </div>
        </div>
      </div>

      <div style="margin-top:3rem;text-align:center;opacity:0.4;">
        <p style="font-size:8px;color:#94a3b8;line-height:1.5;font-weight:700;text-transform:uppercase;letter-spacing:-0.025em;max-width:20rem;margin:0 auto;">
          ${safeHtml(branding.footerText)}
        </p>
        <p style="font-size:10px;font-weight:900;margin-top:8px;text-transform:uppercase;letter-spacing:0.2em;" class="${accentColorStyle}">
          Generado por ${safeHtml(myData.nombre)}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default buildInvoiceHtml;
