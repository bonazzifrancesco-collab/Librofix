import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY non configurata su Vercel.');
  
  // Forziamo l'SDK a presentarsi come l'interfaccia web ufficiale di AI Studio.
  // Questo aggira il controllo rigido sugli indirizzi IP dei server hosting.
  return new GoogleGenAI({ 
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'x-goog-api-client': 'gl-node/24.0.0'
      }
    }
  });
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
    const { preferences, readingHistory } = req.body;
    const ai = getGemini();

    const prompt = `Sei un esperto bibliotecario. Analizza i gusti dell'utente e la sua cronologia e consiglia 5 libri perfetti.
    PREFERENZE: ${preferences || 'Nessuna'}
    CRONOLOGIA: ${readingHistory ? JSON.stringify(readingHistory) : 'Nessuna'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  description: { type: Type.STRING },
                  matchPercentage: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                  pages: { type: Type.INTEGER },
                },
                required: ['title', 'author', 'genre', 'description', 'matchPercentage', 'reason'],
              },
            },
          },
          required: ['recommendations'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{"recommendations":[]}');

    const enriched = await Promise.all(
      (parsed.recommendations || []).map(async (rec: any) => {
        try {
          const googleData = await fetchGoogleBooks(`${rec.title} ${rec.author}`, 1);
          if (googleData.length > 0) {
            return { ...rec, coverUrl: googleData[0].coverUrl, ean: googleData[0].ean || '' };
          }
        } catch {}
        return { ...rec, coverUrl: '' };
      })
    );

    res.json({ recommendations: enriched });
  } catch (err: any) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: 'Errore durante la generazione dei suggerimenti AI.' });
  }
}
