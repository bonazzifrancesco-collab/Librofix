import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { title, author } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configurazione GEMINI_API_KEY mancante' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Trova i dettagli completi ed esatti per il libro intitolato "${title}" scritto da "${author || 'Autore Sconosciuto'}".
    
    Restituisci la risposta ESCLUSIVAMENTE in formato JSON (un singolo oggetto) con questa esatta struttura:
    {
      "title": "Titolo corretto",
      "author": "Autore corretto",
      "genre": "Genere letterario",
      "year": "Anno di pubblicazione",
      "description": "Trama accurata in italiano.",
      "pages": 123
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error('Nessun dato restituito');

    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const bookDetails = JSON.parse(cleanJson);

    return new Response(JSON.stringify(bookDetails), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Lookup error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
