import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload bounds to allow webcam snapshot base64 uploads
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Gemini Client as per SDK rules
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY non configurata. Impostala nel pannello dei Segreti (Secrets).");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Fetch helper for Google Books API to search by text query or ISBN
async function fetchGoogleBooks(query: string, limit = 8) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const isbnObj = info.industryIdentifiers?.find((id: any) => id.type === "ISBN_13") || info.industryIdentifiers?.[0];
      const category = info.categories?.[0] || "Generico";
      
      let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      if (coverUrl && coverUrl.startsWith("http://")) {
        coverUrl = coverUrl.replace("http://", "https://");
      }

      return {
        title: info.title || "Titolo Sconosciuto",
        author: info.authors ? info.authors.join(", ") : "Autore Sconosciuto",
        genre: category,
        pages: info.pageCount || 200,
        description: info.description || "Nessuna descrizione disponibile.",
        ean: isbnObj ? isbnObj.identifier : "",
        coverUrl: coverUrl || ""
      };
    });
  } catch (error) {
    console.error("Errore fetch Google Books:", error);
    return [];
  }
}

// 1. Text Search API (Google Books with fallbacks)
app.post("/api/book/search", async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query di ricerca richiesta." });
    return;
  }

  console.log(`[Search] Searching for: "${query}"`);

  try {
    let books = await fetchGoogleBooks(query, 12);
    
    // Fallback using Gemini if Google Books returns nothing or fails
    if (!books || books.length === 0) {
      console.log(`[Search Fallback] Standard fetch returned 0 books for "${query}", triggering Gemini fallback...`);
      try {
        const ai = getGemini();
        const prompt = `L'utente sta cercando un libro con questa query: "${query}".
        Fornisci un elenco di fino a 5 libri reali del mondo reale coerenti con questa ricerca in lingua italiana.
        Cerca di includere libri molto famosi come "Il Signore degli Anelli", "Harry Potter", "Il Nome della Rosa", ecc. se pertinenti alla ricerca.
        Per ciascun libro compila accuratamente le caratteristiche reali (pagine stimate, genere, descrizione in italiano, ecc.).`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                books: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      author: { type: Type.STRING },
                      genre: { type: Type.STRING },
                      pages: { type: Type.INTEGER },
                      description: { type: Type.STRING },
                      ean: { type: Type.STRING },
                      coverUrl: { type: Type.STRING }
                    },
                    required: ["title", "author", "genre", "pages"]
                  }
                }
              },
              required: ["books"]
            }
          }
        });

        const parsed = JSON.parse(response.text?.trim() || '{"books":[]}');
        if (parsed.books && parsed.books.length > 0) {
          // If possible, try to scrape/guess clean cover links or placeholders
          books = parsed.books.map((b: any) => ({
            title: b.title || "Titolo Sconosciuto",
            author: b.author || "Autore Sconosciuto",
            genre: b.genre || "Generico",
            pages: b.pages || 200,
            description: b.description || "Nessuna descrizione disponibile.",
            ean: b.ean || "",
            coverUrl: b.coverUrl || ""
          }));
          console.log(`[Search Fallback] Gemini successfully retrieved ${books.length} books!`);
        }
      } catch (fallbackErr) {
        console.error("Errore fallback Gemini search:", fallbackErr);
      }
    }

    res.json({ books });
  } catch (err: any) {
    console.error("Search API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. ISBN / EAN lookup API
app.post("/api/book/lookup", async (req, res) => {
  const { ean } = req.body;
  if (!ean || typeof ean !== "string") {
    res.status(400).json({ error: "Codice EAN richiesto." });
    return;
  }

  // Remove spacing or hyphens
  const cleanEan = ean.replace(/[\s-]/g, "");

  try {
    // Try Google Books first
    const googleResults = await fetchGoogleBooks(`isbn:${cleanEan}`, 1);
    if (googleResults.length > 0) {
      res.json({ success: true, book: googleResults[0] });
      return;
    }

    // Fallback: Ask Gemini to give us the book metadata from his internal general memory!
    const ai = getGemini();
    const prompt = `Trova i dettagli del libro reale corrispondente all'EAN o ISBN: ${cleanEan}. Se non lo trovi, prova con gli algoritmi e restituisci un libro plausibile o finto con codici EAN coerenti.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            genre: { type: Type.STRING },
            pages: { type: Type.INTEGER, description: "Numero di pagine stimate" },
            description: { type: Type.STRING },
            ean: { type: Type.STRING },
            suggestedRating: { type: Type.INTEGER }
          },
          required: ["title", "author", "genre", "pages"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json({ success: true, book: { ...parsed, coverUrl: "" } });
  } catch (err: any) {
    console.error("EAN lookup failed:", err);
    res.status(500).json({ error: "Impossibile trovare il libro con questo EAN. Inseriscilo manualmente." });
  }
});

// 3. AI Scan Book from Camera (OCR Barcode or Cover Recognition)
app.post("/api/book/scan", async (req, res) => {
  const { image } = req.body; // base64 string
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Immagine fotocamera richiesta (formato Base64)." });
    return;
  }

  try {
    const ai = getGemini();

    // The image payload can match: data:image/png;base64,XXXXXX
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, "");
    
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg", // standard fallback
        data: base64Clean,
      },
    };

    const prompt = `
      Analizza questa foto scattata dall'utente con la fotocamera per scansionare un libro.
      Potrebbe contenere la copertina del libro, il retro (con trama e codice a barre), oppure direttamente un codice a barre EAN/ISBN.

      Compito:
      1. Leggi il codice a barre (EAN-13 / ISBN) se visibile, oppure decifra e leggi il testo del titolo e autore sulla copertina.
      2. Ottieni tutti i dettagli strutturati del libro in lingua ITALIANA.
      3. Suggerisci anche un genere appropriato (es: Romanzo, Thriller, Saggistica, Fantasy, Fantascienza, Biografia, Psicologia, Giallo) ed un numero credibile di pagine.
      4. Restituisci RIGOROSAMENTE i dati nel formato JSON specificato.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Il titolo del libro" },
            author: { type: Type.STRING, description: "Nome e cognome dell'autore" },
            genre: { type: Type.STRING, description: "Il genere letterario principale in italiano" },
            pages: { type: Type.INTEGER, description: "Numero stimato o reale di pagine del libro" },
            description: { type: Type.STRING, description: "Breve sintesi o descrizione accattivante" },
            ean: { type: Type.STRING, description: "Codice EAN a 13 cifre se identificato" },
            confidence: { type: Type.STRING, description: "Livello di confidenza dell'analisi (alto, medio, basso)" }
          },
          required: ["title", "author", "genre", "pages"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");

    // If title and author are successfully found, try to look up a cover using Google Books to enrich the scanned book!
    if (parsed.title && parsed.title !== "Sconosciuto") {
      const enrichment = await fetchGoogleBooks(`${parsed.title} ${parsed.author || ""}`, 1);
      if (enrichment.length > 0) {
        parsed.coverUrl = enrichment[0].coverUrl;
        if (!parsed.ean && enrichment[0].ean) {
          parsed.ean = enrichment[0].ean;
        }
      }
    }

    res.json({ success: true, book: parsed });
  } catch (err: any) {
    console.error("AI Scan failed:", err);
    res.status(500).json({ error: "Scansione fallita. Assicurati che il libro o il codice a barre sia ben illuminato ed inquadrato, o inseriscilo manualmente." });
  }
});

// 4. AISuggestions - Recommend Books based on personal reads, ratings and reviews
app.post("/api/book/recommend", async (req, res) => {
  const { books } = req.body;
  if (!Array.isArray(books)) {
    res.status(400).json({ error: "Elenco libri non valido." });
    return;
  }

  try {
    const ai = getGemini();

    const bookSummary = books.map(b => {
      return `- "${b.title}" di ${b.author} (Genere: ${b.genre}, Stato: ${b.status === 'completed' ? 'Letto' : 'In lettura'}, Voto: ${b.rating ? `${b.rating}/10` : 'Nessuno'}, Recensione: "${b.review || 'Nessuna'}")`;
    }).join("\n");

    const prompt = `
      Sei l'algoritmo di raccomandazione letteraria avanzato di "BookFlix" (un'app stile Netflix per i libri).
      Analizza i gusti letterari del lettore in base alla sua cronologia di lettura e recensioni:
      
      LIBRI DISPONIBILI:
      ${books.length === 0 ? "L'utente non ha ancora aggiunto libri. Consiglia 4 capolavori moderni di generi vari ed entusiasmanti!" : bookSummary}

      Compito:
      1. Genera esattamente 4 suggerimenti di libri REALI del mondo reale altamente personalizzati per questo utente.
      2. Per ogni libro consiglia:
         - Titolo e Autore
         - Genere (es. Romanzo, Thriller, Saggistica ecc.)
         - Descrizione super accattivante che spieghi perché gli piacerà in base ai suoi gusti (propulsiva e calda, stile raccomandazione Netflix)
         - MatchPercentage: percentuale fittizia di affinità tra 85 e 99 (es: 98% Match)
         - Reason: motivo dettagliato tipo "Dato che hai valutato 10/10 [Libro X] per il suo stile profondo, apprezzerai sicuramente..." o basandoti sulle sue recensioni.
         - Pages: numero ideale di pagine di quel libro reale.

      Rispondi RIGOROSAMENTE in formato JSON in lingua ITALIANA.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  description: { type: Type.STRING, description: "Breve descrizione stile Netflix del libro" },
                  matchPercentage: { type: Type.INTEGER, description: "Percentuale (es. 96)" },
                  reason: { type: Type.STRING, description: "Perché è stato consigliato" },
                  pages: { type: Type.INTEGER }
                },
                required: ["title", "author", "genre", "description", "matchPercentage", "reason"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{"recommendations":[]}');

    // Dynamically retrieve high-quality cover images for recommended books if possible, using Google Books behind the scenes!
    const enrichedRecommendations = await Promise.all(
      (parsed.recommendations || []).map(async (rec: any) => {
        try {
          const googleData = await fetchGoogleBooks(`${rec.title} ${rec.author}`, 1);
          if (googleData.length > 0) {
            return {
              ...rec,
              coverUrl: googleData[0].coverUrl,
              ean: googleData[0].ean || ""
            };
          }
        } catch {}
        return { ...rec, coverUrl: "" };
      })
    );

    res.json({ recommendations: enrichedRecommendations });
  } catch (err: any) {
    console.error("AI Recommendations failed:", err);
    res.status(500).json({ error: "Errore durante la generazione dei suggerimenti AI." });
  }
});

// Setup dev vs production environments
async function startServer() {
  // Safely detect if running in production bundle or stand-alone environment
  const isProdFile = typeof __filename !== "undefined" && __filename.includes("server.cjs");
  const isProdArg = !process.argv[1]?.endsWith("server.ts");
  const isProduction = process.env.NODE_ENV === "production" || isProdFile || isProdArg;

  if (!isProduction) {
    try {
      console.log("[BookFlix Server] Initializing Vite dev server in development mode...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("[BookFlix Server] Failed to initialize Vite dev server, falling back to production mode.", err);
      serveStatic();
    }
  } else {
    console.log("[BookFlix Server] Launching in production mode; serving pre-compiled static assets.");
    serveStatic();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BookFlix Server] Active at http://0.0.0.0:${PORT}`);
  });
}

function serveStatic() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

startServer();
