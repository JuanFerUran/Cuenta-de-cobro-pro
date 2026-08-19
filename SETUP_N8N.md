# Guía Completa de Configuración n8n — AXYRA Cuentas de Cobro

## Estado Actual

| Componente | Estado |
|------------|--------|
| Workflow importado en n8n | ✅ `AXYRA - Cuentas de cobro` |
| n8n corriendo en `http://localhost:5678` | ✅ |
| Variables de workflow | ⚠️ Pendiente de configurar |
| Credencial Telegram | ❌ Pendiente de crear |
| Vercel desplegado | ⚠️ Pendiente (después de este commit) |

---

## Paso 1 — Abrir n8n

```bash
! start http://localhost:5678
```

Si es la primera vez, te pedirá crear un usuario admin. Crea uno y anota la contraseña.

---

## Paso 2 — Crear Credencial de Telegram

1. Ir a **Settings** (icono de engranaje ⚙️ en el menú lateral)
2. Click en **Credentials** → **Add Credential**
3. Buscar **Telegram** → selecciona **Telegram Bot API**
4. Ingresa el **Bot Token** que obtuviste de [@BotFather](https://t.me/BotFather)
   - En Telegram, busca `@BotFather` → `/newbot` → sigue los pasos
   - Copia el token que te da (ej: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Click en **Save**

---

## Paso 3 — Configurar Variables de Workflow

1. Abre el workflow **AXYRA - Cuentas de cobro**
2. Click en el ícono de **⚙️ Settings** (arriba a la derecha del canvas)
3. Ve a la pestaña **Variables**
4. Agrega estas 3 variables:

| Nombre | Valor |
|--------|-------|
| `URL_BASE_API` | `https://axyra-cuenta-de-cobro-pro.vercel.app` (o tu URL real de Vercel) |
| `TELEGRAM_BOT_SECRET` | `<el mismo secreto de 32 caracteres que está en Vercel>` |
| `GROQ_API_KEY` | `<tu API key de Groq>` |

---

## Paso 4 — Conectar la Credencial al Trigger

1. En el canvas, haz clic en el nodo **Telegram Trigger**
2. En el panel derecho, busca **Credentials**
3. Selecciona la credencial de Telegram que creaste en el Paso 2
4. El nodo debería mostrar un check verde ✅

---

## Paso 5 — Activar el Workflow

1. En la parte superior derecha del canvas, click en el toggle **Active** para activarlo
2. Debería ponerse en verde y aparecer el texto **Trigger listening**

---

## Paso 6 — Probar el Bot

Desde Telegram, envía estos mensajes en orden:

### Probar `/start`
```
/start
```
→ Debe responder: *"¡Bienvenido al bot de cuentas de cobro AXYRA!"*

### Probar `/vincular`
```
/vincular Juan Pérez 12345678
```
→ Debe responder con confirmación de vinculación
→ Verifica en Supabase → tabla `telegram_users` que existe la fila

### Probar `/ayuda`
```
/ayuda
```
→ Debe mostrar los comandos disponibles

### Probar generación de cuenta
```
Cobrar a Empresa XYZ NIT 900123456 por $2.500.000, prestación de servicios de desarrollo web, banco Bogotá, cuenta ahorros 111-222333
```
→ Debe generar el PDF y enviarlo por Telegram

---

## Paso 7 — Desplegar cambios de Vercel

Los cambios en `api/telegram/inbound.ts` necesitan desplegarse:

```bash
git add index.html index.css api/telegram/inbound.ts GUÍA_N8N.md n8n-workflow-axyra.json n8n-workflow-variables.env
git commit -m "n8n: workflow completo + fix inbound vincular"
git push origin main
```

Vercel desplegará automáticamente. Verifica en el dashboard que la URL sea la que pusiste en `URL_BASE_API`.

---

## Arquitectura del Workflow

```
Telegram Trigger
       │
       ▼
  Extraer Datos ──→ Parsear Comando
       │                  │
       │            ┌─────┼─────┬────────┬──────────┐
       │            │     │     │        │          │
       │         /vinc  /start /ayuda /cancelar   (mensaje normal)
       │            │     │     │        │          │
       │            ▼     ▼     ▼        ▼          ▼
       │      Vincular  Start  Ayuda  Cancelar  Groq LLM
       │      (HTTP)    (TG)  (TG)   (TG)    (Extraer datos)
       │            │                              │
       │            ▼                              ▼
       │      Enviar TG                   Asignar Número (HTTP)
       │                                      │
       │                                      ▼
       │                               Construir InvoiceData
       │                                      │
       │                                      ▼
       │                               Generar PDF (HTTP)
       │                                      │
       │                                      ▼
       │                               Extraer PDF (Code)
       │                                      │
       │                                      ▼
       └─────────────────────────────── Enviar PDF por Telegram
```

---

## Troubleshooting

### El bot no responde nada
- Verifica que el **Telegram Trigger** tenga la credencial conectada (check verde)
- Verifica que el workflow esté **Active** (toggle verde)
- Revisa los **Execution Logs** en n8n (ícono de play ▶ en la parte superior)

### Error 401 en `/api/telegram/inbound`
- Verifica que `TELEGRAM_BOT_SECRET` en n8n sea **exactamente igual** al de Vercel
- Verifica que Vercel tenga el proyecto desplegado con los últimos cambios

### El PDF no llega
- Revisa el log del nodo **Generar PDF** en n8n
- El error más común es que `invoiceData` no tenga la estructura correcta
- Verifica que `branding` tenga `columnLayout: "single"` y `subtotalPosition: "bottom"`

### Groq falla
- Verifica que `GROQ_API_KEY` sea válida en [console.groq.com](https://console.groq.com)
- El modelo `llama-3.3-70b-versatile` debe tener acceso en tu cuenta

---

## Endpoints que usa el workflow

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/api/telegram/inbound` | POST | Vincular cuenta, respuestas de comandos |
| `/api/telegram/generate-invoice` | POST | Generar PDF desde datos del cliente |
| `/api/assign-invoice-number` | POST | Obtener número atómico de factura |

Todos requieren el header `X-Telegram-Bot-Secret` excepto `assign-invoice-number`.
