import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY non configurata.');
  return new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

async function fetchGoogleBooks(query: string, limit = 1) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const isbnObj = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13') || info.industryIdentifiers?.[0];
      let coverUrl = info.imageLinks?.thumbnail || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      return {
        ean: isbnObj?.identifier || '',
        coverUrl,
      };
    });
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { books } = req.body;
  if (!Array.isArray(books)) return res.status(400).json({ error: 'Elenco libri non valido.' });

  try {
    const ai = getGemini();

    const bookSummary = books.length === 0
      ? "L'utente non ha ancora aggiunto libri. Consiglia 4 capolavori moderni di generi vari ed entusiasmanti!"
      : books.map((b: any) =>
          `- "${b.title}" di ${b.author} (Genere: ${b.genre}, Stato: ${b.status === 'completed' ? 'Letto' : 'In lettura'}, Voto: ${b.rating ? `${b.rating}/10` : 'Nessuno'}, Recensione: "${b.review || 'Nessuna'}")`
        ).join('\n');

    const prompt = `
Sei l'algoritmo di raccomandazione letteraria avanzato di "BookFlix" (un'app stile Netflix per i libri).

Analizza i gusti letterari del lettore in base alla sua cronologia di lettura e recensioni:

LIBRI DISPONIBILI:
${bookSummary}

Compito:
1. Genera esattamente 4 suggerimenti di libri REALI altamente personalizzati per questo utente.
2. Per ogni libro fornisci:
   - Titolo e Autore
   - Genere (es. Romanzo, Thriller, Saggistica ecc.)
   - Descrizione accattivante che spieghi perché gli piacerà (stile raccomandazione Netflix)
   - matchPercentage: percentuale fittizia di affinità tra 85 e 99
   - reason: motivo dettagliato basato sui suoi gusti e recensioni
   - pages: numero di pagine reale del libro

Rispondi RIGOROSAMENTE in formato JSON in lingua ITALIANA.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
