# Cuenta-de-cobro-pro — Resumen de Fases 0-5

Este documento resume los cambios realizados en cada fase, los archivos modificados/creados y las instrucciones para activar cada funcionalidad.

---

## FASE0 — Seguridad crítica

### Qué se hizo
- Endurecer `api/send-email.ts`: validar dominio del remitente, sanitizar campos HTML.
- Eliminar SSRF en `api/render-pdf.ts`: ya no se navega a URLs externas.
- Actualizar integración con Groq; eliminar dependencia de Gemini.
- Eliminar imports de módulos Node (`nodemailer`, `@vercel/node`, `@google/genai`) del browser vía import map en `index.html`.
- Asegurar `.gitignore` para excluir `.env`, `.env.*`, `*.local`.

### Archivos modificados
- `api/send-email.ts`
- `api/render-pdf.ts`
- `index.html`
- `.gitignore`

---

## FASE1 — Bugs funcionales

### Qué se hizo
- **Fechas en UTC-5**: funciones `getColombiaDate()` y `getColombiaDueDate()` en `constants.ts`.
- **Inputs de fecha y observaciones**: agregados al formulario en `InvoiceForm.tsx`.
- **Eliminado ExportModalTrigger del preview**: ya no se renderiza dentro del `#invoice-preview` (bug que causaba duplicados).
- **Fix XSS**: reemplazo de `document.write()` por `window.print()`.
- **State stale en handleSendEmail**: uso de `setState(prev => ...)` para evitar estado desactualizado.

### Archivos modificados
- `constants.ts`
- `App.tsx`
- `components/InvoiceForm.tsx`
- `components/Preview.tsx`

---

## FASE2 — PDF único del servidor

### Qué se hizo
- Crear `services/invoiceTemplate.ts` con `buildInvoiceHtml(data, branding)`: HTML puro con estilos inline, sin recursos externos, escape XSS seguro.
- Reescribir `api/render-pdf.ts` con `@sparticuz/chromium@149` + `puppeteer-core@latest`.
- Uso de `page.setContent(html)` en lugar de `page.goto(url)` — elimina SSRF completamente.
- Formato A4, sin márgenes, `preferCSSPageSize: true`.
- Eliminar dependencias muertas: `chrome-aws-lambda`, `html2canvas`, `jspdf`, `puppeteer-core@10`.
- Agregar `@sparticuz/chromium`, `@tailwindcss/vite`, `tailwindcss@4`, `@supabase/supabase-js`, `puppeteer-core@latest`.
- Endurecer `vercel.json` con headers de seguridad y `memory:1024`, `maxDuration:60`.

### Archivos creados
- `services/invoiceTemplate.ts`
- `api/render-pdf.ts` (reescrito)

### Archivos modificados
- `package.json` / `package-lock.json`
- `vercel.json`
- `vite.config.ts` (plugin Tailwind v4)
- `index.css` (`@import "tailwindcss"`)
- `index.html` (removido CDN de Tailwind)

### Archivos eliminados
- `services/pdfService.ts` (jsPDF a mano)
- `services/exportDomPdf.ts` (html2canvas+jsPDF)

---

## FASE3 — Persistencia real (Supabase)

### Qué se hizo
- Crear migración SQL: `supabase/migrations/20260819_create_invoice_tables.sql`.
  - Tabla `invoices`: todos los campos de la factura + `status` (draft/downloaded/sent) + `telegram_user_id` + `pdf_url`.
  - Tabla `invoice_counters`: PK `year`, columna `counter` para numeración atómica.
  - Tabla `telegram_users`: `telegram_chat_id` (bigint, unique), `owner_nombre`, `owner_documento`.
  - RLS habilitado en todas las tablas con políticas de service-role para escrituras serverless.
- Crear `api/assign-invoice-number.ts`: numeración atómica secuencial desde Supabase, fallback a incremento local cuando Supabase no está configurado. Formato esperado: `CC-2026-0001`.
- Crear `api/persist-invoice.ts`: persiste factura al descargar o enviar. No-op silencioso cuando Supabase no está configurado.
- Actualizar `App.tsx`: fetch inicial de número consecutivo al montar, llamada a `persistInvoice` en descargas/envíos, fetch del siguiente número tras envío exitoso.

### Archivos creados
- `api/assign-invoice-number.ts`
- `api/persist-invoice.ts`
- `supabase/migrations/20260819_create_invoice_tables.sql`

### Archivos modificados
- `App.tsx`

---

## FASE4 — Limpieza

### Qué se hizo
- Eliminar Tailwind CDN que aún quedaba en `index.html` (detectado durante FASE2).
- Actualizar `index.css` con `@import "tailwindcss"` correcto para Vite + Tailwind v4.
- Typecheck y build limpios confirmados.

### Archivos modificados
- `index.css`
- `index.html`

---

## FASE5 — Integración Telegram

### Qué se hizo
- Crear tres endpoints en `api/telegram/`:
  - **`inbound.ts`**: recibe peticiones POST del bot, valida `X-Telegram-Bot-Secret`, gestiona comando `/link`, devuelve mensaje de bienvenida.
  - **`link.ts`**: vincula `telegram_chat_id` con la identidad del usuario (`owner_nombre`, `owner_documento`) en Supabase.
  - **`generate-invoice.ts`**: genera PDF vía `buildInvoiceHtml` + `@sparticuz/chromium`, rate limiting de 10 documentos/hora por `chatId`, retorna PDF en base64 para que n8n lo envíe por el canal.
- Rate limiting: mapa in-memory de 1 hora, 10 peticiones máximo por `chatId`.
- Actualizar `.env.example` con variables de Supabase y `TELEGRAM_BOT_SECRET`.
- Actualizar `README.md` con sección del bot de Telegram.

### Archivos creados
- `api/telegram/inbound.ts`
- `api/telegram/link.ts`
- `api/telegram/generate-invoice.ts`

### Archivos modificados
- `.env.example`
- `README.md`

---

## FASE6 — Roadmap (no implementado)

- Soporte para IVA en el cálculo de totales.
- Múltiples líneas en la factura.
- Firma digital integrada.
- Plantillas reutilizables.

---

## Guía de activación — Paso a paso

### 1. Clonar y configurar localmente
```bash
cd Cuenta-de-cobro-pro
npm install
cp .env.example .env
# Editar .env con tus valores reales (no commitear .env)
```

### 2. Base de datos — Aplicar migraciones de Supabase
```bash
# Opción A: desde la CLI de Supabase
supabase link --project-ref <tu-project-ref>
supabase migration up

# Opción B: desde el dashboard de Supabase
# Copiar el contenido de supabase/migrations/20260819_create_invoice_tables.sql
# y ejecutarlo en SQL Editor
```

### 3. Variables de entorno en Vercel
Ir a **Vercel Dashboard → Project → Settings → Environment Variables** y agregar:

| Variable | Valor |
|---|---|
| `SMTP_HOST` | Tu servidor SMTP (ej: `smtp.gmail.com`) |
| `SMTP_PORT` | `465` o `587` |
| `SMTP_SECURE` | `true` o `false` |
| `SMTP_USER` | Tu correo remitente |
| `SMTP_PASS` | Contraseña de aplicación SMTP |
| `FROM_NAME` | Nombre del emisor |
| `GROQ_API_KEY` | Tu API key de Groq |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `TELEGRAM_BOT_SECRET` | Secreto compartido con n8n (mínimo 32 caracteres) |

### 4. Desplegar en Vercel
```bash
vercel --prod
```
O conectar el repo de GitHub en Vercel y usar el despliegue automático.

### 5. Activar bot de Telegram (FASE5)

#### 5.1 Configurar el bot en n8n
- El bot reutiliza `@Axyra_IA_Bot`.
- En n8n, configurar el webhook con el endpoint `POST /api/telegram/inbound`.
- En el header del webhook, agregar:
  ```
  X-Telegram-Bot-Secret: <tu_secreto_compartido>
  ```
- El mismo valor debe estar en la variable de entorno `TELEGRAM_BOT_SECRET` en Vercel.

#### 5.2 Flujo del bot
1. El usuario escribe al bot: `Hola` → el bot llama a `/api/telegram/inbound`.
2. Si no está vinculado, el bot responde:
   ```
   /vincular <tu nombre> <tu documento>
   Ejemplo: /vincular Juan Pérez 12345678
   ```
3. El usuario envía el comando → n8n llama a `/api/telegram/link` → se guarda en `telegram_users`.
4. El usuario envía los datos de la factura → n8n llama a `/api/telegram/generate-invoice` → recibe PDF en base64 → lo envía por Telegram.

#### 5.3 Rate limiting
- Máximo 10 documentos por hora por chat_id.
- Si se excede, se recibe el mensaje: `"Demasiados intentos. Espera 1 hora."`

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/send-email` | Envía factura por correo |
| POST | `/api/generate-description` | Genera descripción con IA (Groq) |
| POST | `/api/render-pdf` | Genera PDF desde HTML (no expuesto al browser) |
| POST | `/api/assign-invoice-number` | Asigna número consecutivo atómico |
| POST | `/api/persist-invoice` | Guarda factura en Supabase |
| POST | `/api/telegram/inbound` | Recibe mensajes del bot |
| POST | `/api/telegram/link` | Vincula chat_id con identidad |
| POST | `/api/telegram/generate-invoice` | Genera PDF y retorna en base64 |

---

## Checklist de aceptación final

| Criterio | Estado |
|---|---|
| `npm run typecheck` limpio (0 errores) | ✅ |
| `npm run build` limpio (0 warnings fatales) | ✅ |
| 1 commit por fase | ✅ (6 commits) |
| Mensajes de commit en español descriptivos | ✅ |
| Sin secretos reales en git | ✅ |
| `.env` excluido por `.gitignore` | ✅ |
| No hay archivos secretos fuera de git | ✅ |
| Numeración atómica con fallback local | ✅ |
| PDF generado solo del servidor | ✅ |
| Fechas en Colombia (UTC-5) | ✅ |
| Inputs de fecha y observaciones | ✅ |
| Preview sin ExportModalTrigger duplicado | ✅ |
| XSS protegido en renderizado | ✅ |
| State no stale en envío de email | ✅ |
| Tailwind con plugin Vite (sin CDN) | ✅ |
| Rate limiting Telegram (10/hora) | ✅ |
| Autenticación endpoints Telegram con header secreto | ✅ |
| README con guía de activación | ✅ |

---

## Archivos clave del proyecto

```
api/
  send-email.ts              — Envío de email con SMTP
  generate-description.ts    — IA descriptiva con Groq
  render-pdf.ts              — Generación de PDF (Chromium server-side)
  assign-invoice-number.ts   — Numeración atómica con Supabase
  persist-invoice.ts         — Persistencia de facturas
  telegram/
    inbound.ts               — Endpoint principal del bot
    link.ts                  — Vinculación de chat_id
    generate-invoice.ts      — Generación de PDF para Telegram

services/
  invoiceTemplate.ts         — buildInvoiceHtml(): HTML puro, inline styles

supabase/
  migrations/
    20260819_create_invoice_tables.sql

components/
  InvoiceForm.tsx            — Formulario con inputs de fecha y observaciones
  Preview.tsx                — Vista previa sin modal duplicado

App.tsx                      — Estado principal, callbacks de persistencia y email

types.ts                     — AppState y tipos relacionados
constants.ts                 — Fechas Colombia, valores por defecto

index.html                   — Sin CDN, sin imports de módulos Node
index.css                    — @import tailwindcss (v4 plugin)
vite.config.ts               — Plugin tailwindcss
vercel.json                  — Headers de seguridad, memoria 1024MB
package.json                 — Dependencias actualizadas
.env.example                 — Plantilla de variables de entorno
README.md                    — Guía de uso y activación del bot
```
