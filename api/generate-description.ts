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

    if (!text || text.trim().length < 3) {
      res.status(400).json({ 
        success: false, 
        error: 'El texto debe tener al menos 3 caracteres' 
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      res.status(500).json({ 
        success: false, 
        error: 'API key no configurada. Verifica Environment Variables en Vercel.' 
      });
      return;
    }

    const prompts: Record<string, string> = {
      invoice: `Eres un experto en redacción corporativa colombiana. Mejora esta descripción de CUENTA DE COBRO para que sea formal, profesional y directa (máximo 30 palabras): "${text}"`,
      quotation: `Eres un experto en redacción comercial colombiana. Mejora esta descripción de COTIZACIÓN para que sea clara, profesional y atractiva (máximo 40 palabras): "${text}"`,
      proposal: `Eres un experto en redacción de propuestas comerciales. Mejora esta descripción de PROPUESTA para que sea convincente y profesional (máximo 50 palabras): "${text}"`
    };

    // Usar API REST con endpoint correcto
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-01-21:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompts[documentType]
            }]
          }],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google API Error:', errorData);
      res.status(response.status).json({ 
        success: false, 
        error: errorData?.error?.message || `Error: ${response.status}` 
      });
      return;
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

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
