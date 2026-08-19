# Guía práctica de n8n para AXYRA Cuentas de Cobro

Escribe esto en **n8n AI Assistant** (el chat de ayuda que tiene n8n):

---

Crea un workflow de n8n llamado "AXYRA - Cuentas de cobro" con las siguientes especificaciones exactas:

## Credenciales y variables de entorno (usar como Variables de Workflow)

```
URL_BASE_API=https://<tu-proyecto>.vercel.app
TELEGRAM_BOT_SECRET=<secreto_de_32_caracteres>
GROQ_API_KEY=<tu_key_de_Groq>
```

También crear una credencial de **Telegram** en n8n con el token de BotFather.

## Estructura del workflow

### Nodo 1 — Telegram Trigger
- Evento: `message`
- Conectar la credencial de Telegram
- Trigger manual para pruebas

### Nodo 2 — Edit Fields (Nombre: Normalizar)
Crear estas nuevas propiedades a partir del mensaje entrante:

| Propiedad | Expresión |
|-----------|-----------|
| `chatId` | `{{ $json.message.chat.id }}` |
| `messageText` | `{{ $json.message.text || '' }}` |
| `command` | `{{ ($json.message.text || '').split(' ')[0].toLowerCase() }}` |
| `isCommand` | `{{ $json.message.text.startsWith('/') }}` |

### Nodo 3 — HTTP Request (Nombre: Inbound Check)
- Method: POST
- URL: `{{ $env.URL_BASE_API }}/api/telegram/inbound`
- Headers:
  - `Content-Type: application/json`
  - `X-Telegram-Bot-Secret: {{ $env.TELEGRAM_BOT_SECRET }}`
- Body (JSON):
```json
{
  "chatId": "={{ $json.chatId }}",
  "messageText": "={{ $json.messageText }}",
  "action": "={{ $json.command === '/link' ? 'link' : undefined }}"
}
```
- **Continue On Fail: ON** (para capturar errores y mostrarlos al usuario)

### Nodo 4 — Switch (Nombre: Ruteo de comandos)
Evaluar `{{ $json.command }}`:

| Rama | Condición | Acción |
|------|-----------|--------|
| `/start` o welcome | `== '/start'` | Ir a Nodo 7 (enviar mensaje) |
| `/ayuda` | `== '/ayuda'` | Ir a Nodo 8 (mensaje de ayuda) |
| `/vincular` | `== '/vincular'` | Ir a Nodo 5 |
| `/cancelar` | `== '/cancelar'` | Ir a Nodo 9 (limpiar estado) |
| Confirmar | `=~ /confirmar|ok|si|yes/i` | Ir a Nodo 10 (generar PDF) |
| Datos del cliente | por defecto | Ir a Nodo 6 (procesar con Groq) |

### Nodo 5 — HTTP Request (Nombre: Vincular cuenta)
- Method: POST
- URL: `{{ $env.URL_BASE_API }}/api/telegram/link`
- Headers:
  - `Content-Type: application/json`
  - `X-Telegram-Bot-Secret: {{ $env.TELEGRAM_BOT_SECRET }}`
- Body (JSON):
```json
{
  "chatId": "={{ $json.chatId }}",
  "ownerNombre": "={{ $json.messageText.split(' ').slice(1, -1).join(' ') }}",
  "ownerDocumento": "={{ $json.messageText.split(' ').pop() }}"
}
```

### Nodo 6 — HTTP Request (Nombre: Extraer datos con Groq)
- Method: POST
- URL: `https://api.groq.com/openai/v1/chat/completions`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{ $env.GROQ_API_KEY }}`
- Body (JSON):
```json
{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0,
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "Eres un asistente que extrae datos de cuentas de cobro colombianas. Devuelve SOLO un JSON válido con estas claves: cliente_nombre (string), cliente_nit (string), cliente_email (string, vacio si no hay), concepto (string), valor (number), banco (string), tipo_cuenta (string, Ahorros o Corriente), numero_cuenta (string), titular_cuenta (string), observaciones (string, vacio si no hay). valor debe ser numero, no string. Si falta un dato usa cadena vacia. No inventes datos."
    },
    {
      "role": "user",
      "content": "={{ $json.messageText }}"
    }
  ]
}
```
- **Continue On Fail: ON**

### Nodo 7 — Telegram Send Message (Nombre: Enviar respuesta inbound)
- Chat ID: `={{ $json.chatId }}`
- Text: `={{ $json.message || $json.error?.message || JSON.stringify($json) }}`
- Parse mode: Markdown

### Nodo 8 — Telegram Send Message (Nombre: Ayuda)
- Chat ID: `={{ $json.chatId }}`
- Text:
```
📋 *Cuentas de Cobro AXYRA*

/enviar — generar nueva cuenta
/vincular <nombre> <documento> — vincular tu cuenta
/ayuda — este mensaje
/cancelar — cancelar operación

*Comando /enviar:*
Envía los datos en texto libre. Por ejemplo:
"Quiero cobrarle a empresa XYZ con NIT 900123456 por $2.500.000, concepto prestación de servicios, banco Bogotá, cuenta ahorros 123-456789"
```
- Parse mode: Markdown

### Nodo 9 — Telegram Send Message (Nombre: Cancelado)
- Chat ID: `={{ $json.chatId }}`
- Text: `✅ Operación cancelada. Envía /enviar para generar una nueva cuenta.`
- Parse mode: Markdown

### Nodo 10 — HTTP Request (Nombre: Asignar número)
- Method: POST
- URL: `{{ $env.URL_BASE_API }}/api/assign-invoice-number`
- Headers:
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "lastNumero": "CC-{{ new Date().getFullYear() }}-0000"
}
```
- **Continue On Fail: ON**

### Nodo 11 — Edit Fields (Nombre: Construir invoiceData)
Agregar propiedades basadas en Groq y el número asignado:

```
invoiceData.myData.nombre = (de memoria del usuario vinculado — usar valor guardado)
invoiceData.myData.documento = (de memoria del usuario vinculado)
invoiceData.myData.telefono = ""
invoiceData.myData.direccion = ""

invoiceData.clientData.nit = ={{ $json.cliente_nit || '' }}
invoiceData.clientData.nombre = ={{ $json.cliente_nombre || '' }}
invoiceData.clientData.email = ={{ $json.cliente_email || '' }}

invoiceData.bankData.banco = ={{ $json.banco || '' }}
invoiceData.bankData.tipo = ={{ $json.tipo_cuenta || 'Ahorros' }}
invoiceData.bankData.numero = ={{ $json.numero_cuenta || '' }}
invoiceData.bankData.titular = ={{ $json.titular_cuenta || '' }}

invoiceData.invoiceDetails.numero = ={{ $json.numero || '' }}
invoiceData.invoiceDetails.fechaEmision = ={{ $json.fechaEmision || today() }}
invoiceData.invoiceDetails.fechaVencimiento = ={{ $json.fechaVencimiento || '+30 days' }}
invoiceData.invoiceDetails.concepto = ={{ $json.concepto || '' }}
invoiceData.invoiceDetails.valor = ={{ $json.valor || 0 }}
invoiceData.invoiceDetails.observaciones = ={{ $json.observaciones || '' }}

invoiceData.branding.documentTitle = "CUENTA DE COBRO"
invoiceData.branding.documentSubtitle = "Documento equivalente"
invoiceData.branding.primaryColor = "#111827"
invoiceData.branding.accentColor = "#2563eb"
invoiceData.branding.footerText = "Gracias por su pago"
invoiceData.branding.logoUrl = ""
invoiceData.branding.logoBackground = "#ffffff"
invoiceData.branding.columnLayout = "single"
invoiceData.branding.subtotalPosition = "bottom"
```

### Nodo 12 — HTTP Request (Nombre: Generar PDF)
- Method: POST
- URL: `{{ $env.URL_BASE_API }}/api/telegram/generate-invoice`
- Headers:
  - `Content-Type: application/json`
  - `X-Telegram-Bot-Secret: {{ $env.TELEGRAM_BOT_SECRET }}`
- Body (JSON):
```json
{
  "chatId": "={{ $json.chatId }}",
  "invoiceData": "={{ $json.invoiceData }}"
}
```
- **Continue On Fail: ON**

### Nodo 13 — Change (Nombre: Extraer PDF)
- Operación: Set Field
- Name: `pdfBase64` → Value: `={{ $json.pdfBase64 }}`
- Name: `filename` → Value: `={{ $json.filename || 'cuenta_cobro.pdf' }}`
- Name: `numero` → Value: `={{ $json.numero || '' }}`

### Nodo 14 — Telegram Send Document
- Chat ID: `={{ $json.chatId }}`
- File: `={{ $json.pdfBase64 }}` (usar como Base64 / binary)
- Caption: `✅ Cuenta de cobro *{{ $json.numero }}* generada correctamente.`
- Parse mode: Markdown

---

## Errores comunes que corrigen el prompt de Gemini

| Error en el prompt original | Corrección |
|---|---|
| El prompt dice "Data Tables de n8n" | Usar **Edit Fields** con campos estáticos o **Set** con valores del usuario. Data Tables requiere configuración adicional. |
| No menciona `invoiceData.branding` | El endpoint `generate-invoice` lo exige. El prompt lo incluye en la estructura pero el workflow generado a veces lo omite. |
| No menciona el campo `chatId` en el body de `generate-invoice` | Es requerido. Asegurar que se envía. |
| No especifica `columnLayout` y `subtotalPosition` en branding | Valores correctos: `"single"` y `"bottom"`. |
| El body de `assign-invoice-number` espera `lastNumero` | El prompt lo menciona pero no da el formato exacto. Usar `CC-<año>-0000`. |
| No se maneja `Continue On Fail` | Es crítico en los nodos HTTP para no perder al usuario si falla una API. |

## Orden de prueba (paso a paso)

1. **Crear el workflow** usando el prompt anterior en n8n AI Assistant.
2. **Probar `/start`** — debe responder el mensaje de bienvenida.
3. **Probar `/vincular Juan Perez 12345678`** — debe vincular en Supabase.
4. **Verificar en Supabase** — ir a la tabla `telegram_users` y confirmar la fila.
5. **Probar `/enviar` con datos fijos** — usar un mensaje como:
   ```
   Cobrar a Juan Garcia NIT 900.123.456 por $1.500.000, prestacion de servicios, banco Bogotá, cuenta ahorros 111-222333
   ```
6. **Confirmar que llega el PDF a Telegram** — revisar el mensaje con el archivo adjunto.
7. **Si falla el paso 6**, revisar los logs del nodo "Generar PDF" en n8n para ver el error exacto.

## Variables que debes poner en n8n (Workflow Variables)

| Nombre | Valor |
|--------|-------|
| `URL_BASE_API` | `https://<tu-proyecto>.vercel.app` |
| `TELEGRAM_BOT_SECRET` | `<el mismo secreto que pusiste en Vercel>` |
| `GROQ_API_KEY` | `<tu API key de Groq>` |

## Nota importante sobre el secreto

El `TELEGRAM_BOT_SECRET` debe ser **el mismo valor** que configuraste en Vercel. Si no lo has puesto aún:
1. Ir a Vercel Dashboard → tu proyecto → Settings → Environment Variables
2. Agregar `TELEGRAM_BOT_SECRET` con un valor de al menos 32 caracteres
3. Redesplegar el proyecto
