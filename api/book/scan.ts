import { GoogleGenAIServer } from '@google/generative-ai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { base64Image, scannedText } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY mancante' });

    const ai = new GoogleGenAIServer({ apiKey });
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let result;
    if (base64Image) {
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';
      const base64Data = base64Image.split(',')[1] || base64Image;

      result = await model.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analizza questa immagine ed estrai Titolo, Autore, Genere, Pagine e descrizione. Rispondi solo in JSON strutturato." }
      ]);
    } else {
      result = await model.generateContent(`Estrai i dati del libro da questo testo: "${scannedText}". Rispondi solo in JSON.`);
    }

    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Integrazione Google Books per arricchimento copertina
    try {
      const booksResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parsed.title + ' ' + parsed.author)}&maxResults=1`);
      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        if (booksData.items?.[0]) {
          const info = booksData.items[0].volumeInfo;
          parsed.coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://') || '';
        }
      }
    } catch {}

    return res.status(200).json({ success: true, book: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
