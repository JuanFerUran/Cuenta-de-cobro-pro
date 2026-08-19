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

  // Parse command from messageText (handles /vincular, /start, /ayuda, etc.)
  const rawText = (messageText || '').trim();
  const commandMatch = rawText.match(/^\/(\w+)/i);
  const command = commandMatch ? commandMatch[1].toLowerCase() : '';
  const commandArgs = rawText.replace(/^\/\w+\s*/, '').trim();

  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  // Handle /vincular command directly here
  if (command === 'vincular') {
    const parts = commandArgs.split(/\s+/);
    if (parts.length < 2) {
      return res.json({
        success: true,
        action: 'error',
        message: 'Formato incorrecto. Usa: /vincular <nombre completo> <documento>\nEjemplo: /vincular Juan Pérez 12345678',
      });
    }

    const ownerDocumento = parts[parts.length - 1];
    const ownerNombre = parts.slice(0, -1).join(' ').trim();

    if (!ownerNombre || !ownerDocumento) {
      return res.json({
        success: true,
        action: 'error',
        message: 'Formato incorrecto. Usa: /vincular <nombre completo> <documento>',
      });
    }

    if (!supabase) {
      return res.json({
        success: true,
        action: 'error',
        message: 'Error: Supabase no configurado. Contacta al administrador.',
      });
    }

    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from('telegram_users')
        .select('id, owner_nombre')
        .eq('telegram_chat_id', telegramChatId)
        .single();

      if (existing) {
        return res.json({
          success: true,
          action: 'already_linked',
          message: `⚠️ Tu cuenta ya está vinculada.\n\n👤 ${existing.owner_nombre || ownerNombre}\n📄 ${ownerDocumento}\n\nPuedes generar cuentas de cobro ahora.`,
        });
      }

      // Insert link
      const { data: inserted, error } = await supabase
        .from('telegram_users')
        .insert({
          telegram_chat_id: telegramChatId,
          owner_nombre: ownerNombre.slice(0, 200),
          owner_documento: ownerDocumento.slice(0, 50),
        })
        .select('id')
        .single();

      if (error) {
        console.error('[telegram/inbound] insert error:', error);
        return res.json({
          success: true,
          action: 'error',
          message: 'Error al vincular. Intenta de nuevo o contacta soporte.',
        });
      }

      return res.json({
        success: true,
        action: 'linked',
        message: `✅ Cuenta vinculada exitosamente!\n\n👤 ${ownerNombre}\n📄 ${ownerDocumento}\n\nAhora puedes generar tus cuentas de cobro por chat. Envía los datos del cliente y te genero el PDF.`,
      });
    } catch (err) {
      console.error('[telegram/inbound] link error:', err);
      return res.json({
        success: true,
        action: 'error',
        message: 'Error de conexión. Intenta de nuevo.',
      });
    }
  }

  // Check if user is linked (for non-link commands)
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

  // Handle other commands
  if (command === 'start' || command === '') {
    return res.json({
      success: true,
      action: 'welcome',
      message: `👋 ¡Bienvenido al bot de cuentas de cobro AXYRA!\n\nEnvía /ayuda para ver los comandos disponibles.`,
    });
  }

  if (command === 'ayuda') {
    return res.json({
      success: true,
      action: 'help',
      message: `📋 *Cuentas de Cobro AXYRA*\n\n/vincular <nombre> <documento> — vincular tu cuenta\n/ayuda — este mensaje\n\n*Generar cuenta:* Envía los datos en texto libre.\nEjemplo:\n"Cobrar a empresa XYZ NIT 900123456 por $2.500.000, prestación de servicios, banco Bogotá, cuenta ahorros 123-456789"`,
    });
  }

  // Default: process as invoice data
  const welcomeMsg = supabase
    ? `👋 Bot activo`
    : `👋 Bot activo (modo demo)`;

  res.json({
    success: true,
    action: command ? `command_${command}` : 'message',
    message: welcomeMsg,
    command,
  });
}
