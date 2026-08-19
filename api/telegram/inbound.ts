import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function buildError(res: VercelResponse, message: string, status = 400) {
  console.error('[telegram/inbound]', message);
  res.status(status).json({ success: false, message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  // Authenticate via shared secret header
  const secret = req.headers['x-telegram-bot-secret'];
  if (secret !== process.env.TELEGRAM_BOT_SECRET) {
    console.error('[telegram/inbound] Unauthorized');
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const body = req.body ?? {};
  const {
    chatId,
    messageText,
    action,
  } = body as {
    chatId?: string | number;
    messageText?: string;
    action?: 'confirm' | 'edit' | 'cancel' | 'link';
  };

  if (!chatId) {
    return buildError(res, 'Missing chatId', 400);
  }

  const telegramChatId = Number(chatId);
  if (isNaN(telegramChatId)) {
    return buildError(res, 'Invalid chatId', 400);
  }

  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  // Check if user is linked
  if (!action || action !== 'link') {
    if (supabase) {
      const { data: linkedUser } = await supabase
        .from('telegram_users')
        .select('id, owner_nombre')
        .eq('telegram_chat_id', telegramChatId)
        .single();

      if (!linkedUser) {
        return res.json({
          success: true,
          action: 'need_link',
          message: `Hola! Para usar el bot necesitas vincular tu cuenta.\n\nEnvía: /vincular <tu nombre> <tu documento>\n\nEjemplo: /vincular Juan Pérez 12345678`,
        });
      }
    }
  }

  // Handle /link command
  if (action === 'link' && messageText) {
    const parts = messageText.trim().split(/\s+/);
    if (parts.length < 3) {
      return res.json({
        success: true,
        action: 'error',
        message: 'Formato incorrecto. Usa: /vincular <nombre> <documento>\nEjemplo: /vincular Juan Pérez 12345678',
      });
    }

    const ownerDocumento = parts[parts.length - 1];
    const ownerNombre = parts.slice(1, -1).join(' ').trim();

    if (!ownerNombre || !ownerDocumento) {
      return res.json({
        success: true,
        action: 'error',
        message: 'Formato incorrecto. Usa: /vincular <nombre> <documento>',
      });
    }

    // Call the link endpoint
    try {
      const baseUrl = process.env.APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const linkRes = await fetch(`${baseUrl}/api/telegram/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Secret': process.env.TELEGRAM_BOT_SECRET || '',
        },
        body: JSON.stringify({ chatId: telegramChatId, ownerNombre, ownerDocumento }),
      });

      const linkData = await linkRes.json();

      if (linkData.success) {
        return res.json({
          success: true,
          action: 'linked',
          message: `✅ Cuenta vinculada!\n\n👤 ${ownerNombre}\n📄 ${ownerDocumento}\n\nAhora puedes generar tus cuentas de cobro por chat. Envía los datos del cliente y yo te genero el PDF.`,
        });
      } else {
        return res.json({
          success: true,
          action: 'error',
          message: 'Error al vincular. Intenta de nuevo o contacta soporte.',
        });
      }
    } catch (err) {
      console.error('[telegram/inbound] link error:', err);
      return res.json({
        success: true,
        action: 'error',
        message: 'Error de conexión. Intenta de nuevo.',
      });
    }
  }

  // Default: welcome message
  const welcomeMsg = supabase
    ? `👋 ¡Bienvenido al bot de cuentas de cobro AXYRA!\n\nEnvía /ayuda para ver los comandos disponibles.`
    : `👋 Bot activo (modo demo)`;

  res.json({
    success: true,
    action: 'message',
    message: welcomeMsg,
  });
}
