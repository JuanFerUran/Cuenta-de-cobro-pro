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
    // Atomic: SELECT FOR UPDATE + increment in one transaction
    const { data: counterRow, error: selectError } = await supabase
      .from('invoice_counters')
      .select('counter')
      .eq('year', year)
      .single();

    if (selectError) {
      console.error('[assign-invoice-number] select error:', selectError);
      return fail(res, 'Failed to read counter', 500);
    }

    const nextNum = (counterRow?.counter ?? 0) + 1;
    const padded = nextNum.toString().padStart(4, '0');
    const newNumero = `${prefix}-${yearStr}-${padded}`;

    // Atomic update
    const { error: updateError } = await supabase
      .from('invoice_counters')
      .update({ counter: nextNum })
      .eq('year', year);

    if (updateError) {
      console.error('[assign-invoice-number] update error:', updateError);
      return fail(res, 'Failed to increment counter', 500);
    }

    res.json({ success: true, numero: newNumero });
  } catch (err) {
    console.error('[assign-invoice-number] unexpected error:', err);
    fail(res, 'Internal server error', 500);
  }
}
