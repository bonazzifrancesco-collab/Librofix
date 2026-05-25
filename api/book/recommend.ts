import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { preferences, readingHistory } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configurazione GEMINI_API_KEY mancante su Vercel' }), { status: 500 });
    }

    // Inizializzazione corretta con il nuovo SDK
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Sei un esperto bibliotecario e consulente letterario. 
    Analizza i seguenti gusti dell'utente e la sua cronologia di lettura per consigliargli 5 libri perfetti per lui.
    
    PREFERENZE UTENTE: ${preferences || 'Nessuna preferenza specifica indicata'}
    CRONOLOGIA DI LETTURA: ${readingHistory ? JSON.stringify(readingHistory) : 'Nessun libro letto finora'}
    
    Restituisci la risposta ESCLUSIVAMENTE in formato JSON (un array di oggetti) con questa esatta struttura, senza alcun testo o blocco di codice markdown prima o dopo:
    [
      {
        "title": "Titolo del libro",
        "author": "Autore",
        "reason": "Spiegazione personalizzata del perché gli piacerà questo libro (massimo 2 frasi)."
      }
    ]`;

    // Chiamata standard del nuovo SDK con il modello corretto
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error('Risposta vuota ricevuta dall\'AI');
    }

    // Pulisce l'output da eventuali blocchi di codice markdown ```json inviati dall'AI
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const recommendations = JSON.parse(cleanJson);

    return new Response(JSON.stringify(recommendations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Recommend error:', error);
    return new Response(JSON.stringify({ error: 'Errore AI: ' + error.message }), { status: 500 });
  }
}
