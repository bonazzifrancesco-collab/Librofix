import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { genres } = req.body;
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'Generi richiesti.' });
  }

  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
    const genreQuery = genres.slice(0, 3).join('|');

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genreQuery)}&orderBy=newest&maxResults=12&langRestrict=it${key}`
    );

    if (!response.ok) throw new Error('Google Books non risponde.');
    const data = await response.json();
    if (!data.items) return res.json({ books: [] });

    const books = data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const isbnObj = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13') || info.industryIdentifiers?.[0];
      let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      return {
        title: info.title || 'Titolo Sconosciuto',
        author: info.authors?.join(', ') || 'Autore Sconosciuto',
        genre: info.categories?.[0] || genres[0] || 'Generico',
        pages: info.pageCount || 200,
        description: info.description || 'Nessuna descrizione disponibile.',
        ean: isbnObj?.identifier || '',
        coverUrl,
        publishedDate: info.publishedDate || '',
      };
    }).filter((b: any) => b.coverUrl); // mostra solo libri con copertina

    res.json({ books });
  } catch (err: any) {
    console.error('Newreleases error:', err);
    res.status(500).json({ error: 'Errore nel recupero delle novità.' });
  }
}
