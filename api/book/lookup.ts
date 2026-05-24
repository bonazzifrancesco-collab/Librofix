import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchGoogleBooks(query: string, limit = 1) {
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
      title: info.title || 'Sconosciuto',
      author: info.authors?.join(', ') || 'Sconosciuto',
      genre: info.categories?.[0] || 'Generico',
      pages: info.pageCount || 200,
      description: info.description || '',
      ean: isbnObj?.identifier || '',
      coverUrl,
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { ean } = req.body;
  if (!ean) return res.status(400).json({ error: 'EAN richiesto.' });
  const cleanEan = ean.replace(/[\s-]/g, '');
  const results = await fetchGoogleBooks(`isbn:${cleanEan}`, 1);
  if (results.length > 0) return res.json({ success: true, book: results[0] });
  res.status(404).json({ error: 'Libro non trovato.' });
}
