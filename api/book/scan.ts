import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  try {
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Clean,
                },
              },
              {
                type: 'text',
                text: `Analizza questa foto di un libro. Potrebbe mostrare la copertina, il retro con codice a barre, o un codice EAN/ISBN.
Estrai tutti i dettagli del libro in italiano.
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza testo prima o dopo. Struttura esatta:
{"title":"...","author":"...","genre":"...","pages":300,"description":"...","ean":"","confidence":"alta"}

Genere deve essere uno tra: Romanzo, Thriller, Giallo, Fantasy, Fantascienza, Storico, Saggistica, Biografia, Psicologia, Filosofia, Avventura, Horror, Romantico, Classici, Generico.
Se non riesci a leggere il libro, metti "Sconosciuto" nel titolo.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nessun JSON trovato nella risposta.');
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.title || parsed.title === 'Sconosciuto') {
      return res.status(200).json({ success: false, error: 'Libro non riconosciuto. Prova a inquadrare meglio la copertina o il codice a barre.' });
    }

    // Arricchisci con copertina da Google Books
    const enrichment = await fetchGoogleBooks(`${parsed.title} ${parsed.author || ''}`, 1);
    if (enrichment.length > 0) {
      parsed.coverUrl = enrichment[0].coverUrl;
      if (!parsed.ean && enrichment[0].ean) parsed.ean = enrichment[0].ean;
    }

    res.json({ success: true, book: parsed });
  } catch (err: any) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Scansione fallita. Prova a inquadrare meglio il libro o inseriscilo manualmente.' });
  }
}
