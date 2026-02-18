import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
  text: string;
  documentType?: 'invoice' | 'quotation' | 'proposal';
}

interface ResponseData {
  success: boolean;
  result?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ResponseData>
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { text, documentType = 'invoice' } = req.body as RequestBody;

    console.log('Request received:', { text: text?.substring(0, 50), documentType });

    if (!text || text.trim().length < 3) {
      console.log('Text validation failed');
      res.status(400).json({ 
        success: false, 
        error: 'El texto debe tener al menos 3 caracteres' 
      });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    console.log('API Key check:', apiKey ? 'Present' : 'MISSING');
    
    if (!apiKey) {
      res.status(400).json({ 
        success: false, 
        error: 'GROQ_API_KEY no configurada. Agrégala en Vercel Settings → Environment Variables' 
      });
      return;
    }

    const prompts: Record<string, string> = {
      invoice: `Eres un experto en redacción corporativa colombiana. Mejora esta descripción de CUENTA DE COBRO para que sea formal, profesional y directa (máximo 30 palabras): "${text}"`,
      quotation: `Eres un experto en redacción comercial colombiana. Mejora esta descripción de COTIZACIÓN para que sea clara, profesional y atractiva (máximo 40 palabras): "${text}"`,
      proposal: `Eres un experto en redacción de propuestas comerciales. Mejora esta descripción de PROPUESTA para que sea convincente y profesional (máximo 50 palabras): "${text}"`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en redacción corporativa. Responde de forma concisa y profesional.'
          },
          {
            role: 'user',
            content: prompts[documentType]
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);
      res.status(response.status).json({ 
        success: false, 
        error: errorData?.error?.message || `Error: ${response.status}` 
      });
      return;
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content;

    if (!resultText) {
      res.status(500).json({ 
        success: false, 
        error: 'No se generó respuesta de la IA' 
      });
      return;
    }

    const cleanedResult = resultText
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^#+\s*/gm, '');

    res.status(200).json({
      success: true,
      result: cleanedResult
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    
    res.status(500).json({
      success: false,
      error: error?.message || 'Error al generar descripción'
    });
  }
}
