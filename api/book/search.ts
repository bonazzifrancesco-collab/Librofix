import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query mancante' }), { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configurazione GEMINI_API_KEY mancante' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Cerca informazioni strutturate sul libro o sui libri che corrispondono a questa ricerca: "${query}".
    Trova titolo, autore, genere, anno di pubblicazione originale, una breve trama in italiano e il numero di pagine approssimativo.
    
    Restituisci la risposta ESCLUSIVAMENTE in formato JSON (un array di oggetti) con questa esatta struttura:
    [
      {
        "title": "Titolo del libro",
        "author": "Autore",
        "genre": "Genere principale",
        "year": "Anno",
        "description": "Breve trama in italiano (2-3 frasi).",
        "pages": 300
      }
    ]`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-002',
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error('Nessun dato dall\'AI');

    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const books = JSON.parse(cleanJson);

    return new Response(JSON.stringify(books), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
