import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function fail(res: VercelResponse, message: string, status = 500) {
  console.error('[assign-invoice-number]', message);
  res.status(status).json({ success: false, message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Fallback: client-side sequential numbering when Supabase is not configured
    const body = req.body ?? {};
    const { lastNumero } = body as { lastNumero?: string };

    if (!lastNumero) {
      return fail(res, 'Missing lastNumero', 400);
    }

    const parts = lastNumero.split('-');
    if (parts.length !== 3) {
      return fail(res, 'Invalid numero format', 400);
    }

    const prefix = parts[0];
    const year = parts[1];
    const currentNum = parseInt(parts[2], 10);
    const newNum = (currentNum + 1).toString().padStart(4, '0');

    res.json({ success: true, numero: `${prefix}-${year}-${newNum}` });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const body = req.body ?? {};
  const { lastNumero } = body as { lastNumero?: string };

  if (!lastNumero) {
    return fail(res, 'Missing required field: lastNumero', 400);
  }

  const parts = lastNumero.split('-');
  if (parts.length !== 3) {
    return fail(res, 'Invalid numero format. Expected: PREFIX-YEAR-XXXX', 400);
  }

  const prefix = parts[0];
  const yearStr = parts[1];
  const year = parseInt(yearStr, 10);

  if (isNaN(year)) {
    return fail(res, 'Invalid year in numero', 400);
  }

  try {
    // The database function increments and returns the counter in one transaction.
    const { data: nextNum, error: counterError } = await supabase
      .rpc('next_invoice_counter', { counter_year: year });

    if (counterError || typeof nextNum !== 'number') {
      console.error('[assign-invoice-number] counter error:', counterError);
      return fail(res, 'Failed to increment counter. Apply the latest Supabase migration and verify SUPABASE_SERVICE_ROLE_KEY.', 500);
    }

    const padded = nextNum.toString().padStart(4, '0');
    const newNumero = `${prefix}-${yearStr}-${padded}`;

    res.json({ success: true, numero: newNumero });
  } catch (err) {
    console.error('[assign-invoice-number] unexpected error:', err);
    fail(res, 'Internal server error', 500);
  }
}
