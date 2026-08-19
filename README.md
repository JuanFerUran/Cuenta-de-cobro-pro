
# Generador de Cuentas de Cobro - Juan Fernando Uran Vanegas

Esta aplicación permite generar documentos de cuenta de cobro profesionales en formato A4, permitiendo descarga, impresión y envío por correo electrónico directo al cliente.

## Requisitos Previos
- Node.js instalado.
- Cuenta en Vercel o Netlify para el despliegue de las funciones serverless.
- Credenciales SMTP (ej: Gmail con contraseña de aplicación, SendGrid, Mailgun).

## Instrucciones para Ejecución Local
1. Clona o descarga este código.
2. Asegúrate de tener el archivo `logo.png` en la raíz (puedes usar el proporcionado).
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Para probar la función de correo localmente con Vercel:
   - Instala Vercel CLI: `npm i -g vercel`
   - Ejecuta: `vercel dev`
   - Configura las variables de entorno en un archivo `.env` local.

## Despliegue en Vercel (Recomendado)
1. Sube el código a un repositorio de GitHub.
2. Importa el proyecto en [Vercel](https://vercel.com).
3. **IMPORTANTE**: Configura las Variables de Entorno en el panel de Vercel:
   - `SMTP_HOST`: Dirección de tu servidor SMTP.
   - `SMTP_PORT`: Puerto (comúnmente 465 o 587).
   - `SMTP_SECURE`: `true` para puerto 465, `false` para 587.
   - `SMTP_USER`: Tu correo/usuario SMTP.
   - `SMTP_PASS`: Tu contraseña o token.
   - `FROM_NAME`: El nombre que aparecerá como remitente.
4. Haz clic en "Deploy".

## Despliegue en Netlify
1. Mueve el contenido de `api/send-email.ts` a `netlify/functions/send-email.ts` (ajustando la sintaxis a Netlify Functions si es necesario).
2. Configura las variables de entorno en el panel de Netlify.
3. Despliega el repositorio.

## Uso de la Aplicación
1. **Mis Datos**: Están precargados. Use el interruptor si desea cambiarlos (se guardan en memoria local).
2. **Cliente**: Ingrese NIT, Nombre y Email de destino.
3. **Pago**: Configure su banco una única vez; la app lo recordará.
4. **CC**: El número se genera automáticamente (CC-AÑO-####). Se incrementa al enviar un correo con éxito.
5. **Acciones**:
   - **Descargar**: Genera el PDF y lo descarga localmente.
   - **Imprimir**: Abre el diálogo de impresión del navegador.
   - **Enviar Email**: Genera el PDF y lo envía adjunto a la dirección del cliente.

## Bot de Telegram
Para activar la integración con el bot (@Axyra_IA_Bot):

La guía completa y el prompt para construir el workflow en n8n están en [N8N_PROMPT.md](N8N_PROMPT.md).

1. Configura `TELEGRAM_BOT_SECRET` en Vercel.
2. Configura la misma clave en n8n como variable `TELEGRAM_BOT_SECRET`.
3. El bot usa el header `X-Telegram-Bot-Secret:<secreto>` para autenticar llamadas a los endpoints:
   - `POST /api/telegram/inbound` — recibe mensajes del usuario
   - `POST /api/telegram/link` — vincula chat_id con identidad del emisor
   - `POST /api/telegram/generate-invoice` — genera PDF y lo retorna en base64
4. Rate limiting: 10 documentos por hora por usuario Telegram.
5. Aplicar la migración `supabase/migrations/20260819_create_invoice_tables.sql` para la tabla `telegram_users`.

## Seguridad
Las credenciales SMTP nunca se exponen al navegador. El frontend envía los datos del PDF y el destino a la API serverless, que es la única que tiene acceso a las variables de entorno seguras en el servidor. Todos los endpoints serverless validan headers de seguridad en producción.
