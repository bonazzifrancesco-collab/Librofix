import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { X, Search, BookOpen, Hash, Tag, FileText, Calendar, Star, Sparkles, Check } from 'lucide-react';

interface AddBookModalProps {
  initialStatus?: 'planning' | 'reading' | 'completed';
  initialBookData?: any; // populated from webcam scanner
  onClose: () => void;
  onAddBook: (book: Omit<Book, 'id'>) => void;
}

// Warm leather & library aesthetic palettes
const SPINE_COLORS = [
  '#5c2020', // Burgundy Classic
  '#1b4332', // Deep Emerald Forest
  '#0d3b66', // Deep Royal Blue
  '#b18a28', // Honey Gold Foil
  '#4a306d', // Elegant Royal Plum
  '#2a2a2e', // Carbon Charcoal Matte
  '#7a3f1d', // Rich Espresso Wood
  '#0e5f76', // Vintage Peacock Teal
];

const SPINE_STYLES: Array<'classic' | 'modern' | 'fancy' | 'minimalist'> = [
  'classic',
  'modern',
  'fancy',
  'minimalist',
];

export default function AddBookModal({
  initialStatus = 'planning',
  initialBookData = null,
  onClose,
  onAddBook,
}: AddBookModalProps) {
  // Database book lookup states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHint, setSearchHint] = useState('');

  // Core Book form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [pages, setPages] = useState<number>(200);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [ean, setEan] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');

  // Status & Reading Dates
  const [status, setStatus] = useState<'planning' | 'reading' | 'completed'>(initialStatus);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Rating and review
  const [rating, setRating] = useState<number>(8); // 1-10 scale
  const [review, setReview] = useState('');

  // Populate from scanner/initial data
  useEffect(() => {
    if (initialBookData) {
      setTitle(initialBookData.title || '');
      setAuthor(initialBookData.author || '');
      setGenre(initialBookData.genre || '');
      setPages(initialBookData.pages || 200);
      setEan(initialBookData.ean || '');
      setCoverUrl(initialBookData.coverUrl || '');
      setDescription(initialBookData.description || '');
      if (initialBookData.suggestedRating) {
        setRating(initialBookData.suggestedRating);
      }
    }
  }, [initialBookData]);

  // Sync dates & page limits automatically if status swaps
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (status === 'reading' && !startDate) {
      setStartDate(today);
    } else if (status === 'completed') {
      if (!startDate) setStartDate(today);
      if (!endDate) setEndDate(today);
      setCurrentPage(pages); // set to max
    }
  }, [status, pages]);

  // Google Books direct lookup
  const handleDatabaseSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchHint('');
      setSearchResults([]);

      const response = await fetch('/api/book/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore durante la ricerca.");
      }

      setSearchResults(data.books || []);
      if ((data.books || []).length === 0) {
        setSearchHint("Nessun libro trovato. Inserisci manualmente i dettagli.");
      }
    } catch (err: any) {
      console.error(err);
      setSearchHint("Ricerca fallita. Inserisci manualmente i dettagli.");
    } finally {
      setIsSearching(false);
    }
  };

  // EAN code inline lookup
  const handleEanLookup = async () => {
    if (!ean.trim()) return;

    try {
      setIsSearching(true);
      setSearchHint('Ricerca codice EAN...');
      const response = await fetch('/api/book/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ean }),
      });
      const data = await response.json();
      
      if (response.ok && data.success && data.book) {
        const b = data.book;
        setTitle(b.title || '');
        setAuthor(b.author || '');
        setGenre(b.genre || 'Generico');
        setPages(b.pages || 200);
        setDescription(b.description || '');
        setCoverUrl(b.coverUrl || '');
        setSearchHint('Trovato! Campi popolati automaticamente.');
      } else {
        setSearchHint('Nessun libro trovato per questo EAN. Compila a mano.');
      }
    } catch (err) {
      setSearchHint('EAN non trovato.');
    } finally {
      setIsSearching(false);
    }
  };

  // Click on a search item to auto populate
  const selectSearchItem = (item: any) => {
    setTitle(item.title);
    setAuthor(item.author);
    setGenre(item.genre || 'Generico');
    setPages(item.pages || 200);
    setDescription(item.description || '');
    setEan(item.ean || '');
    setCoverUrl(item.coverUrl || '');
    setSearchResults([]); // clear dropdown
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !author.trim()) {
      alert("Titolo e Autore sono obbligatori!");
      return;
    }

    // Auto assign physics constraints & nice designs for visual spine representation
    const chosenColor = SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)];
    const chosenHeight = Math.floor(Math.random() * (172 - 132 + 1)) + 132; // between 132px and 172px high
    const chosenStyle = SPINE_STYLES[Math.floor(Math.random() * SPINE_STYLES.length)];

    onAddBook({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim() || 'Generico',
      pages: Math.max(1, pages),
      currentPage: status === 'completed' ? pages : Math.min(pages, Math.max(0, currentPage)),
      ean: ean.trim(),
      coverUrl: coverUrl.trim(),
      description: description.trim(),
      status,
      startDate: startDate || undefined,
      endDate: status === 'completed' ? (endDate || undefined) : undefined,
      rating: status === 'completed' ? rating : undefined,
      review: status === 'completed' ? review.trim() : undefined,
      spineColor: chosenColor,
      spineHeight: chosenHeight,
      spineStyle: chosenStyle,
    });
  };

  return (
    <div id="add-book-modal" className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 flex justify-between items-center bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-amber-500 w-5 h-5 animate-pulse" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Aggiungi Libro</h3>
          </div>
          <button
            id="close-add-modal"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

          {/* 1. SEARH INTEGRATION (STILE NETFLIX DATABASE AUTO-POPULATE) */}
          <div className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-xl space-y-3">
            <label className="text-xs uppercase font-bold tracking-widest text-amber-500 block">Database Libri (Auto-Compilazione)</label>
            <p className="text-[11px] text-zinc-400">Cerca un libro, inserisci un codice EAN o scansionalo per far auto-popolare i campi sottostanti.</p>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cerca per titolo, autore o ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDatabaseSearch()}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg pl-9 pr-3 py-2 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-sans"
                />
              </div>
              <button
                type="button"
                id="btn-trigger-search"
                onClick={handleDatabaseSearch}
                disabled={isSearching}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition shrink-0"
              >
                {isSearching ? '...' : 'Cerca'}
              </button>
            </div>

            {searchHint && (
              <p className="text-[10px] text-zinc-400 italic mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" /> {searchHint}
              </p>
            )}

            {/* Autofill Search Dropdown list */}
            {searchResults.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-2xl mt-2 divide-y divide-zinc-850">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectSearchItem(item)}
                    className="p-3 flex items-center gap-3 hover:bg-zinc-850 cursor-pointer transition"
                  >
                    {item.coverUrl ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded shadow-md border border-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                        📖
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">di {item.author}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 inline-block font-sans mt-1 capitalize">
                        {item.genre}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Starts */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Titolo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Es: Il Nome della Rosa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition"
                />
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Autore <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Es: Umberto Eco"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition"
                />
              </div>

              {/* Genre Selector or write-in */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Genere</label>
                <input
                  type="text"
                  placeholder="Es: Giallo, Romanzo, Fantasy..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition"
                  list="genres-options"
                />
                <datalist id="genres-options">
                  <option value="Romanzo" />
                  <option value="Thriller" />
                  <option value="Saggistica" />
                  <option value="Fantasy" />
                  <option value="Fantascienza" />
                  <option value="Giallo" />
                  <option value="Biografia" />
                  <option value="Psicologia" />
                  <option value="Storico" />
                </datalist>
              </div>

              {/* EAN barcode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                  <span>Codice EAN / ISBN</span>
                  {ean && (
                    <button
                      type="button"
                      onClick={handleEanLookup}
                      className="text-[9px] text-amber-400 font-bold uppercase hover:underline transition"
                    >
                      AI Lookup
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Es: 9788845292446"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-mono"
                />
              </div>

              {/* Cover Url */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">URL Immagine Copertina</label>
                <input
                  type="url"
                  placeholder="https://esempio.com/copertina.jpg (lascia vuoto per creare una copertina personalizzata)"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-sans text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Trama / Descrizione</label>
                <textarea
                  rows={3}
                  placeholder="Inserisci una breve trama..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition leading-relaxed"
                />
              </div>
            </div>

            {/* Split row for total pages & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900 pt-5">
              
              {/* Pages */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Numero Pagine Totali</label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-mono text-center"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Stato di Lettura</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition"
                >
                  <option value="planning">Da Leggere</option>
                  <option value="reading">In Lettura</option>
                  <option value="completed">Terminato</option>
                </select>
              </div>

              {/* Current reading page (only for Reading Status) */}
              {status === 'reading' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex justify-between">
                    <span>Pagina Corrente</span>
                    <span className="text-[10px] text-zinc-400 italic">max {pages}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={pages}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Math.min(pages, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-mono text-center text-amber-400 font-bold"
                  />
                </div>
              ) : (
                <div className="hidden"></div>
              )}
            </div>

            {/* Reading Timeline (Dates) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-900 pt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Data Inizio Lettura
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-850 focus:border-red-600 focus:outline-none transition font-sans"
                />
              </div>

              {status === 'completed' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Data Fine Lettura
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-850 focus:border-red-600 focus:outline-none transition font-sans"
                  />
                </div>
              )}
            </div>

            {/* 3. SECTION: RATING & REVIEWS (VALUTAZIONE DA 1 A 10 E RECENSIONE) */}
            {status === 'completed' && (
              <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-widest text-amber-400 block">La Mia Valutazione & Recensione</label>
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 py-0.5 px-2.5 rounded-full text-amber-300 text-xs font-black font-mono">
                    ★ {rating} / 10
                  </div>
                </div>

                {/* Rating slide block from 1 to 10 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold px-1 select-none">
                    <span>1 (Pessimo)</span>
                    <span className="text-zinc-300">5 (Mediocre)</span>
                    <span>10 (Eccezionale!)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Stars checklist */}
                <div className="flex justify-center gap-1">
                  {[...Array(10)].map((_, i) => {
                    const val = i + 1;
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setRating(val)}
                        className={`p-1 hover:scale-110 transition ${val <= rating ? 'text-amber-400' : 'text-zinc-700'}`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    );
                  })}
                </div>

                {/* Long Form Review Textbox */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">La Mia Recensione Critica</label>
                  <textarea
                    rows={3}
                    placeholder="Racconta cosa ti ha colpito o deluso... Le tue opinioni alimenteranno i suggerimenti personalizzati dell'AI!"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full bg-zinc-950 text-sm text-white rounded-lg p-2.5 border border-zinc-850 focus:border-red-600 focus:outline-none transition leading-relaxed font-sans placeholder-zinc-650"
                  />
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="px-1 py-3 bg-zinc-950 flex justify-end gap-3.5 border-t border-zinc-900">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition py-2.5 px-6 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-850"
              >
                Annulla
              </button>
              <button
                type="submit"
                id="sumbit-book-btn"
                className="text-xs font-bold uppercase tracking-wider text-white py-2.5 px-6 rounded-lg bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 active:scale-95 transition"
              >
                Salva Libro
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
