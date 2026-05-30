import type { VercelRequest, VercelResponse } from '@vercel/node';

const GENRE_MAP: Record<string, string[]> = {
  'Romanzo': ['fiction', 'literary fiction', 'romanzo'],
  'Thriller': ['thriller', 'suspense', 'mystery thriller'],
  'Giallo': ['mystery', 'detective', 'giallo'],
  'Fantasy': ['fantasy', 'epic fantasy'],
  'Fantascienza': ['science fiction', 'sci-fi'],
  'Storico': ['historical fiction', 'storia'],
  'Saggistica': ['nonfiction', 'essays', 'saggistica'],
  'Biografia': ['biography', 'autobiography', 'memoir'],
  'Psicologia': ['psychology', 'self-help'],
  'Filosofia': ['philosophy'],
  'Horror': ['horror'],
  'Romantico': ['romance', 'romantic fiction'],
  'Avventura': ['adventure'],
  'Classici': ['classics', 'literary classics'],
  'Generico': ['fiction'],
};

async function fetchBooksForGenre(genre: string, apiKey: string): Promise<any[]> {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const searchTerms = GENRE_MAP[genre] || ['fiction'];
  const term = searchTerms[0];
  const key = apiKey ? '&key=' + apiKey : '';

  const results: any[] = [];

  for (const year of [currentYear, lastYear]) {
    try {
      const query = encodeURIComponent(term);
      const url = 'https://www.googleapis.com/books/v1/volumes?q=subject:' + query
        + '&orderBy=newest'
        + '&maxResults=8'
        + '&printType=books'
        + '&filter=ebooks'
        + key;

      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.items) continue;

      for (const item of data.items) {
        const info = item.volumeInfo || {};
        const pubDate: string = info.publishedDate || '';
        const pubYear = parseInt(pubDate.slice(0, 4));

        if (pubYear < lastYear) continue;

        const isbnObj = (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_13')
          || (info.industryIdentifiers || [])[0];

        let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
        if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');

        if (!coverUrl) continue;
        if (!info.title || !info.authors) continue;

        results.push({
          title: info.title,
          author: info.authors.join(', '),
          genre: genre,
          pages: info.pageCount || 0,
          description: info.description ? info.description.slice(0, 200) + '...' : 'Nessuna descrizione disponibile.',
          ean: isbnObj?.identifier || '',
          coverUrl,
          publishedDate: pubDate,
          publisher: info.publisher || '',
          googleLink: info.infoLink || '',
        });

        if (results.length >= 6) break;
      }

      if (results.length >= 4) break;
    } catch {
      continue;
    }
  }

  return results;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { genres } = req.body;
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'Generi richiesti.' });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY || '';

  try {
    const allBooks: any[] = [];
    const seen = new Set<string>();

    for (const genre of genres.slice(0, 3)) {
      const books = await fetchBooksForGenre(genre, apiKey);
      for (const book of books) {
        const key = book.title.toLowerCase() + book.author.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allBooks.push(book);
        }
      }
    }

    if (allBooks.length === 0) {
      const fallbackRes = await fetch(
        'https://www.googleapis.com/books/v1/volumes?q=fiction&orderBy=newest&maxResults=12&printType=books' + (apiKey ? '&key=' + apiKey : '')
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items) {
          for (const item of fallbackData.items) {
            const info = item.volumeInfo || {};
            let coverUrl = info.imageLinks?.thumbnail || '';
            if (coverUrl.startsWith('http://')) coverUrl = coverUrl.replace('http://', 'https://');
            if (!coverUrl || !info.title) continue;
            allBooks.push({
              title: info.title,
              author: info.authors?.join(', ') || 'Autore sconosciuto',
              genre: genres[0] || 'Generico',
              pages: info.pageCount || 0,
              description: info.description?.slice(0, 200) || '',
              coverUrl,
              publishedDate: info.publishedDate || '',
              googleLink: info.infoLink || '',
            });
          }
        }
      }
    }

    res.json({ books: allBooks.slice(0, 12) });
  } catch (err: any) {
    console.error('Newreleases error:', err);
    res.status(500).json({ error: 'Errore nel recupero delle novita.' });
  }
}
