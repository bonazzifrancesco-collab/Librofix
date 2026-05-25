import { GoogleGenAI, Type } from '@google/genai';

// Inizializzazione immediata e pulita dell'SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: any, res: any) {
  // Gestione del metodo corretto
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { preferences, readingHistory } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY mancante su Vercel.' });
    }

    const prompt = `Sei un esperto bibliotecario. Analizza i gusti dell'utente e la sua cronologia e consiglia 5 libri perfetti.
    PREFERENZE: ${preferences || 'Nessuna'}
    CRONOLOGIA: ${readingHistory ? JSON.stringify(readingHistory) : 'Nessuna'}`;

    // Chiamata diretta con lo schema di validazione nativo dell'SDK 1.29
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-002',
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

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'Risposta vuota ricevuta da Gemini.' });
    }

    const parsedData = JSON.parse(responseText.trim());

    // Integrazione super-leggera con Google Books per recuperare le copertine
    const enrichedRecommendations = await Promise.all(
      (parsedData.recommendations || []).map(async (book: any) => {
        try {
          const searchQuery = encodeURIComponent(`${book.title} ${book.author}`);
          const booksApiUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1`;
          
          const booksResponse = await fetch(booksApiUrl);
          if (booksResponse.ok) {
            const booksData = await booksResponse.json();
            if (booksData.items && booksData.items.length > 0) {
              const volumeInfo = booksData.items[0].volumeInfo;
              const identifiers = volumeInfo.industryIdentifiers || [];
              const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier || '';
              let coverUrl = volumeInfo.imageLinks?.thumbnail || '';
              
              if (coverUrl.startsWith('http://')) {
                coverUrl = coverUrl.replace('http://', 'https://');
              }
              
              return { ...book, coverUrl, ean: isbn13 };
            }
          }
        } catch (e) {
          console.error('Google Books error for ' + book.title, e);
        }
        return { ...book, coverUrl: '', ean: '' };
      })
    );

    return res.status(200).json({ recommendations: enrichedRecommendations });

  } catch (err: any) {
    console.error('Recommend system error:', err);
    return res.status(500).json({ error: 'Errore interno del server: ' + err.message });
  }
}
