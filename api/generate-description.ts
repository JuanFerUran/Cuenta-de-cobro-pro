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

    const apiKey = process.env.HF_API_KEY;
    
    if (!apiKey) {
      res.status(500).json({ 
        success: false, 
        error: 'HF_API_KEY no configurada. Regístrate en huggingface.co y agrega la key en Vercel' 
      });
      return;
    }

    const prompts: Record<string, string> = {
      invoice: `Eres un experto en redacción corporativa colombiana. Mejora esta descripción de CUENTA DE COBRO para que sea formal, profesional y directa (máximo 30 palabras): "${text}"`,
      quotation: `Eres un experto en redacción comercial colombiana. Mejora esta descripción de COTIZACIÓN para que sea clara, profesional y atractiva (máximo 40 palabras): "${text}"`,
      proposal: `Eres un experto en redacción de propuestas comerciales. Mejora esta descripción de PROPUESTA para que sea convincente y profesional (máximo 50 palabras): "${text}"`
    };

    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompts[documentType],
          parameters: {
            max_length: 200,
            temperature: 0.7,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('HF API Error:', errorData);
      res.status(response.status).json({ 
        success: false, 
        error: errorData?.error || `Error: ${response.status}` 
      });
      return;
    }

    const data = await response.json();
    
    // Hugging Face devuelve array de resultados
    let resultText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      resultText = data[0].generated_text;
    } else if (data?.generated_text) {
      resultText = data.generated_text;
    }

    if (!resultText) {
      res.status(500).json({ 
        success: false, 
        error: 'No se generó respuesta de la IA' 
      });
      return;
    }

    // Limpiar el resultado (remover el prompt original si está incluido)
    const cleanedResult = resultText
      .replace(prompts[documentType], '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^#+\s*/gm, '')
      .substring(0, 200);

    res.status(200).json({
      success: true,
      result: cleanedResult || 'Texto generado exitosamente'
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    
    res.status(500).json({
      success: false,
      error: error?.message || 'Error al generar descripción'
    });
  }
}
