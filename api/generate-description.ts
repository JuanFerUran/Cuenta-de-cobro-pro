import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_TEXT_LENGTH = 500;
const MAX_RESULT_LENGTH = 2000;

function safeString(value: unknown, maxBytes = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxBytes).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Servicio de IA no disponible' });
  }

  const { text, documentType = 'invoice' } = (req.body ?? {}) as { text?: unknown; documentType?: string };
  const safeText = safeString(text);
  const safeDocumentType = safeString(documentType, 50);

  if (!safeText || safeText.length < 3) {
    return res.status(400).json({ error: 'Texto insuficiente para optimizar' });
  }

  const systemPrompt = `You are a professional billing assistant in Colombia. You optimize invoice descriptions for clarity and legal compliance. Respond in Spanish. Never include pricing information.`;
  const userPrompt = `Optimize this invoice description for a cuenta de cobro: "${safeText}". Type: ${safeDocumentType}. Return only the optimized text, no quotes.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const textBody = await response.text().catch(() => '');
      console.error('[generate-description] Groq error', response.status, textBody);
      return res.status(response.status).json({ error: 'Error en el proveedor de IA' });
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({ error: 'Sin respuesta del modelo' });
    }

    return res.status(200).json({
      success: true,
      result: safeString(result, MAX_RESULT_LENGTH),
    });
  } catch (err) {
    console.error('[generate-description] Request error');
    return res.status(500).json({ error: 'Error de conexión con IA' });
  }
}
