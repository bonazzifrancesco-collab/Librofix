import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY non configurata.');
  return new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
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

  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Immagine richiesta in formato Base64.' });
  }

  try {
    const ai = getGemini();
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Clean } },
          { text: `Analizza questa foto per scansionare un libro. Potrebbe contenere la copertina, il retro con codice a barre, oppure un codice EAN/ISBN.
1. Leggi il codice a barre (EAN-13/ISBN) se visibile, oppure decifra titolo e autore dalla copertina.
2. Ottieni tutti i dettagli in lingua ITALIANA.
3. Suggerisci un genere (Romanzo, Thriller, Saggistica, Fantasy, Fantascienza, Biografia, Psicologia, Giallo) e un numero credibile di pagine.
4. Restituisci RIGOROSAMENTE i dati nel formato JSON specificato.` }
        ]
      },
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
            confidence: { type: Type.STRING },
          },
          required: ['title', 'author', 'genre', 'pages'],
        },
      },
    });

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
    res.status(500).json({ error: 'Scansione fallita. Assicurati che il libro sia ben illuminato, o inseriscilo manualmente.' });
  }
}
