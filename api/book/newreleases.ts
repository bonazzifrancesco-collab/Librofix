import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { genres } = req.body;
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'Generi richiesti.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  try {
    const currentYear = new Date().getFullYear();
    const prompt = `Sei un esperto libraio italiano aggiornato sulle ultime uscite editoriali.

Genera una lista di 12 libri REALI usciti tra il ${currentYear - 1} e il ${currentYear} nei seguenti generi: ${genres.join(', ')}.

I libri DEVONO essere reali, pubblicati di recente, e preferibilmente disponibili in italiano (originali italiani o traduzioni recenti).

Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick. Struttura esatta:
{"books":[{"title":"...","author":"...","genre":"...","pages":300,"description":"Breve trama in italiano (2 frasi)","publishedDate":"2024","publisher":"..."}]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('Anthropic API error');

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nessun JSON trovato.');
    const parsed = JSON.parse(jsonMatch[0]);

    const booksWithCovers = await Promise.all(
      (parsed.books || []).map(async (book: any) => {
        try {
          const key = process.env.GOOGLE_BOOKS_API_KEY ? '&key=' + process.env.GOOGLE_BOOKS_API_KEY : '';
          const query = encodeURIComponent(book.title + ' ' + book.author);
          const gbRes = await fetch('https://www.googleapis.com/books/v1/volumes?q=' + query + '&maxResults=1' + key);
          if (gbRes.ok) {
            const gbData = await gbRes.json();
            if (gbData.items?.[0]) {
              const info = gbData.items[0].volumeInfo;
              let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
              if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
              return { ...book, coverUrl };
            }
          }
        } catch {}
        return { ...book, coverUrl: '' };
      })
    );

    res.json({ books: booksWithCovers });
  } catch (err: any) {
    console.error('Newreleases error:', err);
    res.status(500).json({ error: 'Errore nel recupero delle novita.' });
  }
}
