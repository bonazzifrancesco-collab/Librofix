import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchGoogleBooks(query: string, limit = 8) {
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
      let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
      if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
      return {
        title: info.title || 'Titolo Sconosciuto',
        author: info.authors ? info.authors.join(', ') : 'Autore Sconosciuto',
        genre: info.categories?.[0] || 'Generico',
        pages: info.pageCount || 200,
        description: info.description || 'Nessuna descrizione disponibile.',
        ean: isbnObj ? isbnObj.identifier : '',
        coverUrl,
      };
    });
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query richiesta.' });

  const books = await fetchGoogleBooks(query, 12);
  res.json({ books });
}
