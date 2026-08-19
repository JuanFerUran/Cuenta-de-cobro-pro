import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function buildError(res: VercelResponse, message: string, status = 400) {
  console.error('[telegram/link]', message);
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
    console.error('[telegram/link] Unauthorized');
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return buildError(res, 'Supabase no configurado', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const body = req.body ?? {};
  const {
    chatId,
    ownerNombre,
    ownerDocumento,
  } = body as {
    chatId?: string | number;
    ownerNombre?: string;
    ownerDocumento?: string;
  };

  if (!chatId) {
    return buildError(res, 'Missing chatId', 400);
  }

  if (!ownerNombre || !ownerDocumento) {
    return buildError(res, 'Missing ownerNombre and ownerDocumento', 400);
  }

  const telegramChatId = Number(chatId);
  if (isNaN(telegramChatId)) {
    return buildError(res, 'Invalid chatId (must be a number)', 400);
  }

  try {
    // Check if already linked
    const { data: existing } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('telegram_chat_id', telegramChatId)
      .single();

    if (existing) {
      return res.json({
        success: true,
        message: 'Chat ya vinculado previamente',
        chatId: telegramChatId,
      });
    }

    // Insert new link
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
      console.error('[telegram/link] insert error:', error);
      return buildError(res, 'Error al vincular', 500);
    }

    res.json({
      success: true,
      message: 'Chat vinculado exitosamente',
      chatId: telegramChatId,
      userId: inserted.id,
    });
  } catch (err) {
    console.error('[telegram/link] unexpected error:', err);
    buildError(res, 'Error del servidor', 500);
  }
}
