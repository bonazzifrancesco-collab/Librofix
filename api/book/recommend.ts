import { GoogleGenAIServer } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  // Gestione del metodo corretto
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { preferences, readingHistory } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY mancante su Vercel.' });
    }

    // Usiamo il core stabile compatibile al 100% con Vercel Serverless
    const ai = new GoogleGenAIServer({ apiKey });
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Sei un esperto bibliotecario. Analizza i gusti dell'utente e la sua cronologia e consiglia 5 libri perfetti.
    PREFERENZE: ${preferences || 'Nessuna'}
    CRONOLOGIA: ${readingHistory ? JSON.stringify(readingHistory) : 'Nessuna'}
    
    Restituisci la risposta ESCLUSIVAMENTE in formato JSON (un oggetto con un array chiamato "recommendations") con questa esatta struttura, senza blocchi di codice markdown:
    {
      "recommendations": [
        {
          "title": "Titolo",
          "author": "Autore",
          "genre": "Genere",
          "description": "Trama breve in italiano",
          "matchPercentage": 95,
          "reason": "Spiegazione breve",
          "pages": 300
        }
      ]
    }`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    if (!responseText) {
      return res.status(500).json({ error: 'Risposta vuota ricevuta da Gemini.' });
    }

    // Pulisce l'output da eventuali tag markdown ```json aggiunti dall'AI
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    // Integrazione con Google Books per recuperare le copertine
    const enrichedRecommendations = await Promise.all(
      (parsedData.recommendations || []).map(async (book: any) => {
        try {
          const searchQuery = encodeURIComponent(`${book.title} ${book.author}`);
          const booksResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1`);
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
