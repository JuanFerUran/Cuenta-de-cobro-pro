import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { AppState } from '../types';

function fail(res: VercelResponse, message: string, status = 500) {
  console.error('[persist-invoice]', message);
  res.status(status).json({ success: false, message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // When Supabase is not configured, silently succeed (localStorage remains the source of truth)
  if (!supabaseUrl || !supabaseKey) {
    res.json({ success: true, message: 'Persistence skipped — Supabase not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const body = req.body ?? {};
  const { state, action } = body as { state?: AppState; action?: 'downloaded' | 'sent' };

  if (!state) {
    return fail(res, 'Missing required field: state', 400);
  }

  if (action !== 'downloaded' && action !== 'sent') {
    return fail(res, 'Invalid action. Expected: downloaded | sent', 400);
  }

  try {
    const { error } = await supabase.from('invoices').insert({
      numero: state.invoiceDetails.numero,
      cliente_nombre: state.clientData.nombre,
      cliente_nit: state.clientData.nit,
      cliente_email: state.clientData.email || null,
      emisor_nombre: state.myData.nombre,
      emisor_documento: state.myData.documento,
      emisor_telefono: state.myData.telefono || null,
      emisor_direccion: state.myData.direccion || null,
      banco: state.bankData.banco || null,
      cuenta_tipo: state.bankData.tipo,
      cuenta_numero: state.bankData.numero || null,
      cuenta_titular: state.bankData.titular || null,
      concepto: state.invoiceDetails.concepto,
      valor: state.invoiceDetails.valor,
      fecha_emision: state.invoiceDetails.fechaEmision || null,
      fecha_vencimiento: state.invoiceDetails.fechaVencimiento || null,
      observaciones: state.invoiceDetails.observaciones || null,
      status: action === 'sent' ? 'sent' : 'downloaded',
    });

    if (error) {
      console.error('[persist-invoice] insert error:', error);
      return fail(res, 'Failed to persist invoice', 500);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[persist-invoice] unexpected error:', err);
    fail(res, 'Internal server error', 500);
  }
}
