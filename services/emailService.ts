
export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  filename: string;
  pdfBase64: string;
}

export const sendEmail = async (payload: EmailPayload) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'No se pudo conectar con el servidor de correos.' };
  }
};
