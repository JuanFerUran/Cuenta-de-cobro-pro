# Prompt para crear la automatizacion de n8n

Copia el siguiente texto en el asistente de n8n. Reemplaza los valores entre corchetes antes de ejecutar el workflow.

```text
Quiero crear un workflow de n8n llamado "AXYRA - Cuentas de cobro" para un bot de Telegram.

OBJETIVO
El bot debe recibir mensajes de Telegram, vincular al emisor, recopilar los datos de una cuenta de cobro usando IA, pedir confirmacion y generar un PDF mediante mi API desplegada en Vercel.

DATOS DE CONFIGURACION
- URL_BASE_API: [https://mi-proyecto.vercel.app]
- TELEGRAM_BOT_SECRET: [el mismo secreto configurado en Vercel]
- GROQ_API_KEY: [mi clave de Groq]
- MODELO_GROQ: llama-3.3-70b-versatile
- Credencial Telegram de n8n: [la credencial creada con el token de BotFather]

REGLAS DE SEGURIDAD
1. Todas las llamadas a mi API deben ser POST y deben incluir estos headers:
   Content-Type: application/json
   X-Telegram-Bot-Secret: TELEGRAM_BOT_SECRET
2. Nunca envies al usuario, a Telegram ni al frontend las claves de Supabase, SMTP, Groq o Telegram.
3. El token de BotFather debe permanecer solo en la credencial de Telegram de n8n.
4. Usa message.chat.id como chatId. Usa message.from.id solo como identificador informativo.
5. Rechaza mensajes que no tengan message.chat.id.
6. No generes un PDF hasta que el usuario confirme los datos.

ENDPOINTS DE VERCEL
1. POST URL_BASE_API/api/telegram/inbound
   Body: { chatId, messageText, action }
2. POST URL_BASE_API/api/telegram/link
   Body: { chatId, ownerNombre, ownerDocumento }
3. POST URL_BASE_API/api/assign-invoice-number
   Body: { lastNumero }
4. POST URL_BASE_API/api/telegram/generate-invoice
   Body: { chatId, invoiceData }

ESTRUCTURA OBLIGATORIA DE invoiceData
{
  "myData": {
    "nombre": "",
    "documento": "",
    "telefono": "",
    "direccion": ""
  },
  "clientData": {
    "nit": "",
    "nombre": "",
    "email": ""
  },
  "bankData": {
    "banco": "",
    "tipo": "Ahorros",
    "numero": "",
    "titular": ""
  },
  "invoiceDetails": {
    "numero": "",
    "fechaEmision": "YYYY-MM-DD",
    "fechaVencimiento": "YYYY-MM-DD",
    "concepto": "",
    "valor": 0,
    "observaciones": ""
  },
  "editMyData": false,
  "branding": {
    "documentTitle": "CUENTA DE COBRO",
    "documentSubtitle": "Documento equivalente",
    "primaryColor": "#111827",
    "accentColor": "#2563eb",
    "footerText": "Gracias por su pago",
    "logoUrl": "",
    "logoBackground": "#ffffff",
    "columnLayout": "double",
    "subtotalPosition": "bottom"
  }
}

MEMORIA POR USUARIO
Usa Data Tables de n8n, o un equivalente persistente, para guardar un registro por chatId. La clave debe ser telegram_invoice_<chatId>. Guarda:
- chatId
- ownerNombre
- ownerDocumento
- invoiceData parcial
- estado de la conversacion
- fecha de ultima actualizacion

No uses una variable global compartida por todos los usuarios.

NODOS DEL WORKFLOW
1. Telegram Trigger
   Evento: mensaje recibido.
2. Edit Fields - Normalizar mensaje
   Crear:
   chatId = {{$json.message.chat.id}}
   messageText = {{$json.message.text || ''}}
   telegramUserId = {{$json.message.from.id}}
   command = el primer token en minusculas de messageText.
3. Data Table - Leer estado
   Buscar por chatId.
4. Switch - Enrutamiento
   Ramas: /start, /ayuda, /vincular, /cancelar, confirmar, y mensaje de datos.

COMPORTAMIENTO

A. /start, /ayuda o primer mensaje
- Llama a /api/telegram/inbound con chatId y messageText.
- Envia la propiedad message de la respuesta mediante Telegram Send Message.
- Si la respuesta indica need_link, pide exactamente:
  /vincular Nombre completo Documento

B. /vincular
- Separa el primer token (/vincular), el ultimo token (documento) y todos los tokens intermedios (nombre completo).
- Si no hay al menos un nombre y un documento, responde con el formato correcto.
- Llama a /api/telegram/link con:
  { chatId, ownerNombre, ownerDocumento }
- Envia confirmacion al usuario.

C. Recopilar datos con Groq
- Llama a https://api.groq.com/openai/v1/chat/completions.
- Usa Authorization: Bearer GROQ_API_KEY.
- Usa model llama-3.3-70b-versatile, temperature 0 y response_format json_object.
- El system prompt debe indicar:
  "Extrae datos de una cuenta de cobro. Devuelve solo JSON valido con las claves cliente_nombre, cliente_nit, cliente_email, concepto, valor, banco, tipo_cuenta, numero_cuenta, titular_cuenta y observaciones. valor debe ser un numero. Si falta un dato usa cadena vacia. No inventes datos."
- Combina el resultado con los datos del emisor vinculado y con el estado anterior.
- Guarda el estado actualizado en Data Tables.
- Si faltan datos, pregunta solo por los campos faltantes.

D. Confirmacion
- Cuando esten completos cliente, concepto, valor, banco y cuenta, muestra un resumen legible.
- Pregunta: "Responde CONFIRMAR para generar el PDF o CANCELAR para detenerlo."
- No generes el documento hasta recibir CONFIRMAR.

E. Generacion
- Llama a /api/assign-invoice-number con lastNumero. Si no existe, usa CC-YYYY-0000 usando el año actual de Colombia.
- Usa la respuesta numero en invoiceData.invoiceDetails.numero.
- Usa fechas YYYY-MM-DD.
- Llama a /api/telegram/generate-invoice con:
  { chatId, invoiceData }
- Si responde 429, informa que debe esperar una hora.
- Si responde error, no intentes reenviar automaticamente; informa el error y conserva el estado.

F. Envio del PDF
- Toma pdfBase64, filename y numero de la respuesta.
- Usa Convert to File con operacion "Move Base64 String to File", MIME application/pdf y propiedad binaria data.
- Usa Telegram Send Document con chatId y propiedad binaria data.
- Caption: "Cuenta de cobro NUMERO generada correctamente."
- Limpia el estado temporal despues de enviar correctamente.

MANEJO DE ERRORES
- 401: informa que existe un problema de autenticacion y detiene el flujo.
- 400: envia el mensaje de validacion recibido.
- 429: informa el limite de 10 documentos por hora.
- 500: informa que el servicio no pudo generar el documento y conserva los datos.
- Configura Continue On Fail solo en nodos donde el flujo pueda manejar explicitamente el error.

ENTREGA
Genera el workflow con nombres claros, conexiones completas, expresiones validas de n8n y nodos Telegram Send Message/Send Document. No pongas secretos literales en campos visibles si n8n permite usar credenciales o variables. Incluye un nodo de prueba con datos de factura fijos para comprobar primero la generacion del PDF antes de activar Groq y la memoria.
```

## Orden de prueba

1. Probar `/start`.
2. Probar `/vincular Juan Perez 12345678`.
3. Confirmar la fila en `telegram_users` de Supabase.
4. Ejecutar el nodo de PDF con datos fijos.
5. Confirmar que el PDF llega a Telegram.
6. Activar Groq.
7. Activar la memoria por `chatId`.
8. Activar el workflow en producción.