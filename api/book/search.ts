import { GoogleGenAIServer } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { query } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY mancante' });

    const ai = new GoogleGenAIServer({ apiKey });
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Cerca informazioni sul libro: "${query}". Trova titolo, autore, genere, anno, una breve trama in italiano e pagine.
    Rispondi ESCLUSIVAMENTE in formato JSON (un array di oggetti) con questa struttura:
    [
      {
        "title": "Titolo",
        "author": "Autore",
        "genre": "Genere",
        "year": "Anno",
        "description": "Trama breve",
        "pages": 300
      }
    ]`;

    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanJson));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
