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

  const { books } = req.body;
  if (!Array.isArray(books)) return res.status(400).json({ error: 'Elenco libri non valido.' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  try {
    const bookSummary = books.length === 0
      ? "L'utente non ha ancora aggiunto libri. Consiglia 4 capolavori moderni di generi vari ed entusiasmanti!"
      : books.map((b: any) =>
          `- "${b.title}" di ${b.author} (Genere: ${b.genre}, Stato: ${b.status === 'completed' ? 'Letto' : 'In lettura'}, Voto: ${b.rating ? `${b.rating}/10` : 'Nessuno'}, Recensione: "${b.review || 'Nessuna'}")`
        ).join('\n');

    const prompt = `Sei l'algoritmo di raccomandazione letteraria di "Libroflix" (app stile Netflix per i libri).

Analizza i gusti del lettore:
${bookSummary}

Genera esattamente 4 suggerimenti di libri REALI personalizzati. Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza testo prima o dopo. Struttura esatta:
{"recommendations":[{"title":"...","author":"...","genre":"...","description":"...","matchPercentage":95,"reason":"...","pages":300}]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Estrae il JSON anche se Claude aggiunge testo attorno
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nessun JSON trovato nella risposta.');
    const parsed = JSON.parse(jsonMatch[0]);

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
