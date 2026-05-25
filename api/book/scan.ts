import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { scannedText } = await req.json();
    if (!scannedText) {
      return new Response(JSON.stringify({ error: 'Nessun testo scansionato fornito' }), { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configurazione GEMINI_API_KEY mancante' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Analizza il seguente blocco di testo estratto dalla scansione o foto di un libro. Individua se contiene titolo, autore o codice ISBN e ricostruisci i dati del libro.
    
    TESTO SCANSIONATO:
    "${scannedText}"
    
    Restituisci la risposta ESCLUSIVAMENTE in formato JSON (un singolo oggetto) con questa esatta struttura:
    {
      "title": "Titolo identificato",
      "author": "Autore identificato",
      "genre": "Genere stimato",
      "year": "Anno",
      "description": "Breve riassunto o nota del libro trovato.",
      "pages": 0
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error('Nessun dato estratto');

    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const scannedBook = JSON.parse(cleanJson);

    return new Response(JSON.stringify(scannedBook), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
