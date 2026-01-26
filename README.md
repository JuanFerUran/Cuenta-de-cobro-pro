
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

## Seguridad
Las credenciales SMTP nunca se exponen al navegador. El frontend envía los datos del PDF y el destino a la API serverless, que es la única que tiene acceso a las variables de entorno seguras en el servidor.
