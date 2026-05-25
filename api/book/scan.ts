import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY non configurata.');
  return new GoogleGenAI({ apiKey: key });
}

async function fetchGoogleBooks(query: string, limit = 1) {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}${key}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const isbnObj = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13') || info.industryIdentifiers?.[0];
      let coverUrl = info.imageLinks?.thumbnail || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      return { ean: isbnObj?.identifier || '', coverUrl };
    });
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  try {
    const { base64Image, scannedText } = req.body;
    const ai = getGemini();
    
    let response;

    if (base64Image) {
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';
      const base64Data = base64Image.split(',')[1] || base64Image;
      
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analizza la copertina o il retro di questo libro. Estrai Titolo, Autore, Genere, Pagine e una breve descrizione in italiano. Rispondi solo in formato JSON." }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              genre: { type: Type.STRING },
              pages: { type: Type.INTEGER },
              description: { type: Type.STRING },
              ean: { type: Type.STRING },
            },
            required: ['title', 'author', 'genre', 'pages'],
          }
        }
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Analizza questo testo scansionato da un libro ed estrai i dettagli. TEXT: "${scannedText}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              genre: { type: Type.STRING },
              pages: { type: Type.INTEGER },
              description: { type: Type.STRING },
              ean: { type: Type.STRING },
            },
            required: ['title', 'author', 'genre', 'pages'],
          }
        }
      });
    }

    const parsed = JSON.parse(response.text?.trim() || '{}');

    if (parsed.title && parsed.title !== 'Sconosciuto') {
      const enrichment = await fetchGoogleBooks(`${parsed.title} ${parsed.author || ''}`, 1);
      if (enrichment.length > 0) {
        parsed.coverUrl = enrichment[0].coverUrl;
        if (!parsed.ean && enrichment[0].ean) parsed.ean = enrichment[0].ean;
      }
    }

    res.json({ success: true, book: parsed });
  } catch (err: any) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Impossibile completare l\'analisi ottica dell\'immagine.' });
  }
}
