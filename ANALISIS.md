# Análisis del proyecto — AXYRA Cuentas de Cobro Pro

**Fecha:** 18 de agosto de 2026  
**Stack:** React 19 + TypeScript + Vite 6 + Vercel Serverless  
**Alcance:** revisión de arquitectura, seguridad, bugs reales, código muerto y deuda técnica.

---

## 1. Qué es este proyecto

SPA para generar cuentas de cobro (Colombia): editor + preview A4 en vivo, personalización de marca, descarga/impresión PDF y envío por correo con adjunto.

Hay **tres caminos de PDF** que conviven y se pisan:

| Camino | Dónde | Estado |
|---|---|---|
| Puppeteer (`chrome-aws-lambda`) | `api/render-pdf.ts` | El que se intenta usar primero |
| `html2canvas` + `jsPDF` | `services/exportDomPdf.ts` | Importado, casi nunca se ejecuta |
| `jsPDF` dibujado a mano | `services/pdfService.ts` | Importado en `App.tsx` y **nunca se llama** |
| Fallback `window.open` + Tailwind CDN | `App.tsx` / `Preview.tsx` | El que realmente corre en local |

En la práctica, en desarrollo local el PDF **no se genera**: se abre una ventana y se pide `Ctrl+P`. En Vercel, Puppeteer con `chrome-aws-lambda@10` es frágil y caro (timeout, tamaño de lambda, Chromium viejo).

---

## 2. Hallazgos críticos (arreglar primero)

### 2.1 API de correo abierta — cualquiera puede enviar emails con tu SMTP

`api/send-email.ts` no tiene autenticación, CSRF, rate limit ni lista blanca de destinatarios. Cualquiera que conozca la URL puede POSTear:

```json
{ "to": "victima@correo.com", "subject": "...", "text": "...", "filename": "x.pdf", "pdfBase64": "..." }
```

y el servidor envía el correo **desde tu cuenta SMTP**. Eso es un open-relay: abuso, spam, quema de credenciales Gmail y bloqueo del dominio.

**Corrección mínima:**
- Secret compartido (`x-api-key`) o sesión.
- Rate limit por IP (Vercel Firewall / Upstash).
- Validar `to` contra el email del cliente del payload y un regex estricto.
- Límite de tamaño del PDF (hoy el JSON con base64 puede ser de varios MB).
- No devolver el mensaje crudo de SMTP al cliente (`error.message` filtra host/puerto).

### 2.2 SSRF en `/api/render-pdf`

El frontend manda `url: window.location.origin`. El backend **navega Puppeteer a esa URL** sin validar host:

```ts
const host = url || (req.headers.host ? `${protocol}://${req.headers.host}` : ...);
await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });
```

Un atacante puede pedir render de `http://169.254.169.254/` (metadata de cloud), `http://localhost:6379`, o cualquier intranet. Además inyecta `state` en `localStorage` de esa página.

**Corrección:** ignorar `url` del cliente. Usar solo `https://${process.env.VERCEL_URL}` o un `APP_URL` fijo. Allowlist de hosts.

### 2.3 `.env` no está en `.gitignore`

`.gitignore` ignora `*.local` pero **no** `.env` ni `.env.*`. Un `git add .` sube SMTP, Groq y Gemini al repo.

**Corrección:** añadir:

```
.env
.env.*
!.env.example
```

Rotar cualquier credencial que ya se haya commiteado.

### 2.4 `.env.example` incompleto y desalineado con el código

Documenta SMTP, pero el código usa:

| Variable | Quién la usa | ¿Documentada? |
|---|---|---|
| `SMTP_*` / `FROM_NAME` | `send-email.ts` | Sí |
| `GROQ_API_KEY` | `generate-description.ts` | **No** |
| `GEMINI_API_KEY` | `vite.config.ts` (inyectada al bundle) | **No**, y **no se usa** |

`vite.config.ts` mete `GEMINI_API_KEY` en el JS del cliente (`process.env.API_KEY`). Si alguien pone una key real ahí, queda pública en el bundle.

### 2.5 Modelo de Groq probablemente muerto

`api/generate-description.ts` llama `llama-3.1-70b-versatile`. Groq decommissionó esa familia; el botón **IA Optimizar** fallará con 4xx. Reemplazar por un modelo vigente (`llama-3.3-70b-versatile` o el que figure en [console.groq.com](https://console.groq.com)).

---

## 3. Bugs funcionales confirmados

### 3.1 El botón «Exportar exacto» sale impreso en el PDF

`ExportModalTrigger` está **dentro** de `#invoice-preview`. Cualquier captura/print del preview incluye el botón «Exportar exacto». Es UI de la app, no del documento.

Moverlo fuera del nodo del documento (toolbar del preview, no el A4).

### 3.2 Numeración de CC se pierde / se pisa

El consecutivo solo incrementa **si el email se envió bien**. Descargar o imprimir no avanza el número → se reutiliza `CC-2026-0001`.

Además el incremento usa estado stale:

```ts
handleUpdate('invoiceDetails', { ...state.invoiceDetails, numero: newNum });
```

Si el usuario editó el concepto mientras se enviaba el correo, se pisan esos cambios.

**Corrección:** incrementar con `setState(prev => ...)`, y decidir una política: ¿el número avanza al generar PDF, al enviar, o hay un contador independiente en localStorage?

### 3.3 Fechas de emisión y vencimiento no se editan ni se muestran bien

`InvoiceDetails` tiene `fechaEmision`, `fechaVencimiento` y `observaciones`. El formulario **no tiene inputs** para ellas. El preview solo muestra `fechaEmision` cruda (`2026-08-18`), no en formato colombiano (`18 de agosto de 2026`). `fechaVencimiento` y `observaciones` no aparecen en el documento.

Default de vencimiento:

```ts
nextMonth.setMonth(nextMonth.getMonth() + 1);
const dueDate = nextMonth.toISOString().split('T')[0];
```

`toISOString()` es UTC. En Colombia (UTC−5) un 31 de enero a las 20:00 puede volverse 1 de marzo o saltarse febrero.

### 3.4 `JSON.parse` de localStorage sin try/catch

```ts
const saved = localStorage.getItem('axyra_invoice_state_v4');
if (saved) {
  const parsed = JSON.parse(saved);
```

Si el JSON está corrupto (cuota llena a medias, logo enorme en base64), la app **no arranca**. El logo se guarda como data URL dentro del mismo state → fácil pasar 5 MB y romper `setItem`.

**Corrección:** parse defensivo, logo en `IndexedDB` o con tope de tamaño (p. ej. 300 KB), merge de defaults campo a campo (hoy un state viejo sin `bankData.tipo` puede romper el `<select>`).

### 3.5 `index.html` está truncado

No cierra `</body></html>`. Los browsers lo toleran, pero es HTML inválido y Vite/SSR futuros lo van a notar.

### 3.6 Fallback de impresión no espera a Tailwind

`document.write` + `<script src="https://cdn.tailwindcss.com">` + `print()` a los 500–1000 ms. Tailwind CDN es asíncrono: a menudo se imprime **sin estilos** (documento crudo, sin colores, layout roto).

### 3.7 `columnLayout` no hace nada

El panel de config ofrece «Una columna / Dos columnas». `Preview.tsx` **nunca lee** `branding.columnLayout`. El usuario cree que cambia el documento y no cambia.

### 3.8 Texto del concepto se sale del PDF de jsPDF

En `pdfService.ts` el recuadro de descripción mide 55 mm y se imprimen **todas** las líneas sin recorte ni página extra. Conceptos largos (los que genera la IA) se pintan encima de «DATOS DE PAGO». Hoy no se usa, pero si se reactiva está roto.

### 3.9 XSS / HTML injection en el fallback de print

```ts
const previewHtml = document.getElementById('invoice-preview')?.outerHTML || '';
win.document.write(`...${previewHtml}...`);
```

Nombre del cliente, concepto, footer, etc. entran como HTML. Un concepto con `<img src=x onerror=...>` o `</td><script>` se ejecuta en la ventana nueva. Sanitizar o, mejor, no clonar HTML: usar `window.print()` sobre la misma página con `@media print`.

### 3.10 No-op en Puppeteer

```ts
window.scrollY === 0; // no hace nada; era un intento de reset de scroll
```

---

## 4. Arquitectura: demasiada complejidad para el problema

### 4.1 Puppeteer en Vercel no es el camino correcto para este producto

`chrome-aws-lambda@10` + `puppeteer-core@10` (2021) está **abandonado**. El sucesor es [`@sparticuz/chromium`](https://github.com/Sparticuz/chromium). Aun con eso:

- Cold start alto, límite de 10–60 s, bundle de Chromium ~50 MB.
- Hay que **cargar toda la SPA** para sacar un PDF de un único nodo.
- El cliente ya tiene el preview renderizado: duplicar eso en el server es desperdicio.

**Recomendación:** una sola estrategia.

1. **Corto plazo (simple, fiable):** `@media print` + `window.print()` sobre `#invoice-preview`. Cero backend, idéntico a lo que ve el usuario. Para email, generar PDF en el cliente con `html2canvas`/`jspdf` **o** un servicio tipo [Gotenberg](https://gotenberg.dev) / Browserless si hace falta calidad.
2. **Si se insiste en server:** `@sparticuz/chromium` + `puppeteer-core` reciente, timeout 60s, memoria 1024 MB, y **no** navegar a la SPA: servir un HTML mínimo del documento.

Hoy hay 4 implementaciones y ninguna es la fuente de verdad.

### 4.2 Tailwind por CDN en producción

```html
<script src="https://cdn.tailwindcss.com"></script>
```

Eso es Play CDN: lento, no cacheable de forma estable, **no recomendado para prod**, y el fallback de print depende de que un script externo compile CSS en runtime. `index.css` además **reimplementa a mano** decenas de utilidades Tailwind (`px-12`, `font-black`, `grid-cols-2`…). Hay dos sistemas de diseño peleando.

**Corrección:** `@tailwindcss/vite` (v4) o PostCSS. Quitar el CDN. Borrar las utilidades duplicadas de `index.css`. Dejar ahí solo print/A4.

### 4.3 Import map de esm.sh en un proyecto Vite

`index.html` declara un import map a `https://esm.sh/react@^19.2.3` **y** Vite empaqueta React. En `npm run dev` / `build` Vite gana; el import map es basura residual de Google AI Studio. También expone `nodemailer` y `@vercel/node` al browser, paquetes que **nunca** deben ir al cliente.

### 4.4 `vercel.json` casi vacío

Solo `buildCommand`. Falta:
- `framework: vite` (o dejar que Vercel lo detecte).
- Límite de duración de las funciones (`maxDuration` para Puppeteer).
- Headers de seguridad (`CSP`, `X-Frame-Options`).
- Rewrites si se usa SPA routing (hoy no hay router, ok).

### 4.5 README desactualizado

- Dice que el logo va «en la raíz»; está en `public/logo.png`.
- Habla de Netlify y no documenta `GROQ_API_KEY`.
- «El número se incrementa al enviar un correo» — y eso es un bug, no una feature clara.
- No explica `npm run dev` (solo `vercel dev`).
- `FROM_NAME` de ejemplo es un nombre de persona; el footer de la app dice «AXYRA SOLUTIONS S.A.S».

---

## 5. Código muerto y dependencias de más

| Pieza | Problema |
|---|---|
| `services/pdfService.ts` | Importado en `App.tsx`, **cero llamadas**. ~230 líneas. |
| `services/exportDomPdf.ts` | Importado en `App` y `Preview`; el modal **nunca llama** `onExport`. `waitForImages` no se usa. |
| `bufferToBase64` en `App.tsx` | Definida, nunca usada. |
| `getBase64ImageFromUrl` | Definida, nunca usada. |
| `COLORS` en `constants.ts` | Nunca importada. |
| `@google/genai` | En `package.json` e import map. Cero imports en código. |
| `html2canvas` / `jspdf` | Solo las usan los servicios muertos. Si se elimina Puppeteer, entonces sí hacen falta; si se queda Puppeteer, sobran. |
| `onClear` en `InvoiceForm` | Prop recibida, nunca usada (el botón está en el header). |

`package.json` no tiene `lint`, `typecheck` ni tests. El script `build` es `vite build` **sin** `tsc`, así que TypeScript no rompe el deploy.

No hay `package-lock.json` en el árbol revisado → builds no reproducibles.

---

## 6. Calidad de TypeScript y React

- `tsconfig` **sin** `strict`, `noUnusedLocals`, `noFallthroughCasesInSwitch`.
- `value: any` / `onUpdate(..., value: any)` en todo el formulario. Se puede tipar:

  ```ts
  function handleUpdate<K extends keyof AppState>(path: K, value: AppState[K])
  ```

- `AppStatus` es un `enum` numérico-string que se usa como UI copy (`'Enviando...'`). Mejor union + mapa de labels.
- `handleChange` hace `{ ...(state[section] as object), [field]: value }` — inseguro si `section` es `editMyData` (boolean). Hoy el caller no lo hace, pero el tipo lo permite.
- Inputs controlados con `value={any}`. El de valor (`type="number"`) con `parseFloat` pierde el estado intermedio (no se puede escribir `""` ni `0.`).
- No hay debounce en `localStorage.setItem` → cada tecla reescribe todo el state (incluido el logo en base64).
- `setTimeout` para toasts sin cleanup → warning de React si el componente se desmonta, y toasts que se pisan.
- `ConfigPanel` y la barra flotante de acciones se solapan en mobile (`bottom-6` ambos).

---

## 7. Seguridad adicional (además de 2.x)

| Riesgo | Dónde | Nota |
|---|---|---|
| Open redirect / PDF de origen arbitrario | `render-pdf` | Ya cubierto (SSRF). |
| Prompt injection a Groq | `generate-description.ts` | El texto del usuario se interpola en el prompt. Para este caso (reescribir un concepto) el impacto es bajo, pero no hay límite de tamaño ni sanitización. |
| Logs con PII | ambas APIs | `console.log` del texto y del body. En Vercel esos logs viven. No loguear conceptos/clientes. |
| CORS por defecto | APIs Vercel | Sin `Origin` check. Con SSRF + email abierto, es peor. |
| Sin CSP | `index.html` | El CDN de Tailwind + Font Awesome + Google Fonts + esm.sh obliga a CSP laxa. Al quitar CDNs se puede poner CSP estricta. |
| Logo sin validación | `ConfigPanel` | Se acepta cualquier `image/png,jpeg` y se mete entero en localStorage. Falta tope de tamaño y tipo real (magic bytes). |
| Email HTML no existe, pero `subject`/`text` van sin sanitizar al SMTP | `send-email.ts` | Hoy es texto plano, ok. No pasar a HTML sin escape. |

---

## 8. UX / producto

- No hay campo de **ítems múltiples** (cantidad × precio). Una cuenta de cobro real casi siempre tiene 2+ líneas. Hoy es un solo concepto + un valor.
- No hay IVA / retefuente / AIU. En Colombia eso duele rápido.
- No hay historial de documentos emitidos. localStorage es un único documento vivo; al «Limpiar campos» se pierde el cliente, no el archivo anterior.
- El número de CC se puede editar a mano y chocar con el autoincremento.
- Preview a `scale(0.7)` dentro de un scroll: en laptop se ve pequeño y el sticky `top-24` recorta.
- Firma: dice «Firma Digitalizada» pero no hay captura de firma ni imagen. Es un label vacío — en un documento legal queda mal.
- Footer legal cita «Art. 774 del código de comercio». Verificar si aplica a cuenta de cobro vs factura electrónica (DIAN). No es consejo legal, pero copiar un artículo mal da falsa seguridad.
- Botón IA sin feedback de error persistente (toast 2–3 s). Si Groq falla, parece que «no hizo nada».
- `handleDownload` cuando Puppeteer falla no descarga nada: muestra un toast de «Presiona Ctrl+P» y abre otra ventana. El usuario pidió «Descargar».
- Accesibilidad: contraste de labels `text-[9px]`, iconos Font Awesome sin `aria-label` en botones de solo icono, el toggle «Editar» es un checkbox `sr-only` cuyo hit-area es el knob, no el texto.

---

## 9. Plan de corrección sugerido (ordenado)

### Sprint 0 — seguridad (1–2 h)

1. Meter `.env` en `.gitignore` y rotar claves.
2. Completar `.env.example` (`GROQ_API_KEY`, quitar Gemini si no se usa).
3. Auth + rate limit en `send-email` y `render-pdf`.
4. Ignorar `url` del cliente en Puppeteer.
5. Quitar `@google/genai` y el `define` de `GEMINI_API_KEY` en Vite.

### Sprint 1 — que el PDF y el mail funcionen de verdad (medio día)

1. **Decidir una sola estrategia de PDF.** Recomendación: print CSS nativo + html2canvas como fallback de descarga; Puppeteer solo si se demuestra necesario.
2. Sacar «Exportar exacto» del DOM del documento.
3. Campos de fecha emisión / vencimiento / observaciones en el form y en el preview, formateados `es-CO`.
4. Consecutivo atómico e independiente del envío de email.
5. Actualizar modelo Groq.
6. `try/catch` en localStorage + tope al logo.

### Sprint 2 — limpieza (2–4 h)

1. Borrar `pdfService.ts` **o** usarlo y borrar Puppeteer + html2canvas. No los tres.
2. Borrar import map, CDN Tailwind, utilidades duplicadas de `index.css`.
3. Instalar Tailwind bien (`@tailwindcss/vite`).
4. Cerrar `index.html`.
5. `strict: true`, script `"typecheck": "tsc --noEmit"`, usarlo en `build`.
6. Tipar `handleUpdate`. Quitar `any`.
7. Actualizar README (dev local, vars reales, sin Netlify si no se soporta).

### Sprint 3 — producto (si se quiere vender / usar en serio)

1. Ítems múltiples + subtotal/IVA.
2. Historial (IndexedDB o backend mínimo).
3. Firma (imagen o canvas).
4. Plantillas (cuenta de cobro vs cotización — `documentType` ya existe en la API de IA y no se usa en UI).
5. Tests de validación y de las APIs (handler con mock de nodemailer).
6. CSP, headers en `vercel.json`.

---

## 10. Mapa rápido de archivos

```
App.tsx                      orquesta estado, validación, PDF/email  — demasiado grande
components/InvoiceForm.tsx   formulario; onClear muerto
components/Preview.tsx       documento A4 + modal de export (mal lugar)
components/ConfigPanel.tsx   branding; columnLayout inerte
services/pdfService.ts       jsPDF manual — MUERTO
services/exportDomPdf.ts     html2canvas — casi muerto
services/emailService.ts     fetch fino, ok
api/send-email.ts            SMTP — SIN AUTH
api/render-pdf.ts            Puppeteer — SSRF + stack 2021
api/generate-description.ts  Groq — modelo viejo, GROQ_API_KEY no documentada
constants.ts / types.ts      campos huérfanos (observaciones, vencimiento, columnLayout)
index.html                   CDN + import map + HTML sin cerrar
index.css                    reimplementa Tailwind
vite.config.ts               filtra GEMINI al cliente
vercel.json                  incompleto
```

---

## 11. Veredicto

El producto **se entiende y la UI está bien pensada** (preview A4, branding, barra de acciones). Por debajo es un prototipo de AI Studio que se fue hinchando: tres generadores de PDF, APIs serverless sin auth, dependencias que no se usan, y el flujo «Descargar / Enviar» no es fiable fuera de un deploy Vercel bien configurado.

No es un rewrite. Es **una decisión de PDF + un pase de seguridad + borrar código muerto**. Con eso queda una herramienta usable. Sin eso, el riesgo real es que alguien abuse del SMTP y que el usuario no pueda sacar un PDF decente en local.

---

## Referencias

- [chrome-aws-lambda está abandonado; sucesor @sparticuz/chromium](https://github.com/Sparticuz/chromium)
- [Tailwind Play CDN no es para producción](https://tailwindcss.com/docs/installation/play-cdn)
- Groq: verificar modelos vigentes en [console.groq.com](https://console.groq.com) antes de hardcodear `llama-3.1-70b-versatile`.
