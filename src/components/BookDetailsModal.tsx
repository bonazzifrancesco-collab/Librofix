import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { X, Calendar, Star, Trash2, Edit3, BookOpen, Clock, Tag } from 'lucide-react';

interface BookDetailsModalProps {
  book: Book;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
  onDeleteBook: (bookId: string) => void;
}

export default function BookDetailsModal({
  book,
  onClose,
  onUpdateBook,
  onDeleteBook,
}: BookDetailsModalProps) {
  // Confirmation state on deleting
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Editable fields states
  const [status, setStatus] = useState<'planning' | 'reading' | 'completed'>(book.status);
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 0);
  const [pages, setPages] = useState<number>(book.pages || 200);
  const [rating, setRating] = useState<number>(book.rating || 8);
  const [review, setReview] = useState(book.review || '');
  const [startDate, setStartDate] = useState(book.startDate || '');
  const [endDate, setEndDate] = useState(book.endDate || '');
  const [genre, setGenre] = useState(book.genre || '');
  const [description, setDescription] = useState(book.description || '');

  // Maintain progress sync
  useEffect(() => {
    if (status === 'completed') {
      setCurrentPage(pages);
      const today = new Date().toISOString().split('T')[0];
      if (!endDate) setEndDate(today);
    }
  }, [status, pages]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    onUpdateBook({
      ...book,
      status,
      currentPage: status === 'completed' ? pages : Math.min(pages, Math.max(0, currentPage)),
      pages: Math.max(1, pages),
      rating: status === 'completed' ? rating : undefined,
      review: status === 'completed' ? review.trim() : undefined,
      startDate: startDate || undefined,
      endDate: status === 'completed' ? (endDate || undefined) : undefined,
      genre: genre.trim() || 'Generico',
      description: description.trim(),
    });
  };

  const pct = Math.round((currentPage / pages) * 100) || 0;

  return (
    <div id="details-modal" className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        
        {/* Header banner with cover background */}
        <div className="relative h-44 bg-gradient-to-br from-zinc-850 via-zinc-900 to-black p-6 flex items-end justify-between border-b border-zinc-900 overflow-hidden">
          <div className="absolute inset-0 bg-zinc-950/40 mix-blend-multiply z-0"></div>
          {book.coverUrl && (
            <img
              referrerPolicy="no-referrer"
              src={book.coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 z-0 select-none pointer-events-none"
            />
          )}

          {/* Core Title Info details */}
          <div className="relative z-10 space-y-1 max-w-[70%]">
            <span className="text-[9px] px-2 py-0.5 bg-red-650 text-white rounded font-bold uppercase tracking-widest inline-block select-none mb-1">
              {book.genre}
            </span>
            <h3 className="text-lg md:text-xl font-black text-white font-serif line-clamp-2 leading-tight">
              {book.title}
            </h3>
            <p className="text-xs text-zinc-300">di {book.author}</p>
          </div>

          <button
            id="close-details-btn"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-zinc-850 absolute top-4 right-4 z-25"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Real physical Cover jacket visual preview overlay */}
          <div className="relative z-10 w-16 h-24 bg-zinc-800 rounded shadow-xl border border-white/10 overflow-hidden shrink-0 -mb-8 origin-bottom hover:scale-105 transition duration-150">
            {book.coverUrl ? (
              <img
                referrerPolicy="no-referrer"
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                style={{ backgroundColor: book.spineColor }}
                className="w-full h-full p-2 flex flex-col justify-between text-white"
              >
                <span className="text-[5px] uppercase tracking-wider font-bold opacity-75">{book.genre}</span>
                <span className="text-[8px] font-bold font-serif line-clamp-3 leading-snug">{book.title}</span>
                <span className="text-[5px] opacity-80 mt-1 truncate">By AI</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {showConfirmDelete ? (
            // Danger double verification step before removal
            <div className="bg-red-950/40 border border-red-900/40 p-5 rounded-xl space-y-4 text-center">
              <Trash2 className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-200 uppercase tracking-widest font-mono">Conferma Eliminazione</h4>
                <p className="text-xs text-zinc-300">Sei sicuro di voler cancellare definitivamente "{book.title}" dalla tua libreria?</p>
                <p className="text-[10px] text-zinc-500 italic">Questa azione non è reversibile.</p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-bold uppercase tracking-wider text-zinc-300 py-2 px-4 rounded-lg transition"
                >
                  Annulla
                </button>
                <button
                  onClick={() => onDeleteBook(book.id)}
                  id="confirm-delete-action"
                  className="bg-red-650 hover:bg-red-700 text-xs font-bold uppercase tracking-wider text-white py-2 px-5 rounded-lg transition"
                >
                  Si, Elimina
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Book Description Box */}
                {description && (
                  <div className="space-y-1.5 md:col-span-2 bg-zinc-900/20 border border-zinc-900 p-3.5 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Trama / Sinossi</span>
                    <p className="text-xs text-zinc-350 leading-relaxed font-sans">{description}</p>
                  </div>
                )}

                {/* Genre Override */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Modifica Genere</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-650 focus:outline-none transition"
                  />
                </div>

                {/* ISBN EAN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">EAN / ISBN</label>
                  <input
                    type="text"
                    disabled
                    value={book.ean || "Non identificato"}
                    className="w-full bg-zinc-900/40 text-sm text-zinc-500 rounded-lg p-2.5 border border-zinc-900/50 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              {/* Status and Progress Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900/50 pt-5">
                
                {/* Status Selector */}
                <div className="space-y-1.5Col">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">Stato di Lettura</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition font-sans"
                  >
                    <option value="planning">Da Leggere</option>
                    <option value="reading">In Lettura</option>
                    <option value="completed">Terminato</option>
                  </select>
                </div>

                {/* Pages Counter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">Pagine Totali</label>
                  <input
                    type="number"
                    min="1"
                    value={pages}
                    onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-zinc-900 text-sm text-white rounded-lg p-2.5 border border-zinc-800 focus:border-red-600 focus:outline-none transition text-center font-mono font-bold"
                  />
                </div>

                {/* Interactive slider/input for dynamic progression */}
                {status === 'reading' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5 flex justify-between">
                      <span>Pagine Lette ({pct}%)</span>
                      <span className="text-zinc-500 text-[10px]">max {pages}</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={pages}
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Math.min(pages, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-zinc-900 text-sm text-amber-500 rounded-lg p-2.5 border border-zinc-800 focus:border-red-655 focus:outline-none transition text-center font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div className="hidden"></div>
                )}
              </div>

              {/* Active sliding Progress Bar if Reading */}
              {status === 'reading' && (
                <div className="space-y-2 bg-zinc-900/20 border border-zinc-900 p-4 rounded-xl">
                  <div className="flex justify-between text-xs text-zinc-400 font-bold">
                    <span>Trascina per aggiornare la pagina:</span>
                    <span className="text-amber-400 font-mono">pag. {currentPage} di {pages}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={pages}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
              )}

              {/* Reading Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-900/50 pt-5">
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

              {/* 3. SECTION: VALUE SCALE & WRITTEN REVIEW (VALUTAZIONE DA 1 A 10 E RECENSIONE) */}
              {status === 'completed' && (
                <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest text-amber-450 block">La Mia Valutazione & Recensione</label>
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 py-0.5 px-2.5 rounded-full text-amber-300 text-xs font-black font-mono">
                      ★ {rating} / 10
                    </div>
                  </div>

                  {/* Rating range slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-zinc-550 font-bold px-1 select-none">
                      <span>1 (Pessimo)</span>
                      <span className="text-zinc-300">5 (Normale)</span>
                      <span>10 (Leggendario!)</span>
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

                  {/* Interactive Star layout */}
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

                  {/* Review Text Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Aggiorna la mia Recensione</label>
                    <textarea
                      rows={3}
                      placeholder="Modifica o scrivi la recensione di questo libro..."
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full bg-zinc-950 text-sm text-white rounded-lg p-2.5 border border-zinc-850 focus:border-red-600 focus:outline-none transition leading-relaxed font-sans placeholder-zinc-700"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-1 py-1 bg-zinc-950 flex justify-between items-center gap-4 border-t border-zinc-900 pt-5">
                <button
                  type="button"
                  id="delete-trigger"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400 font-mono transition py-2 px-3.5 rounded bg-red-950/20 hover:bg-red-950/50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Elimina
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition py-2.5 px-6 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-850"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    id="save-details-action"
                    className="text-xs font-bold uppercase tracking-wider text-white py-2.5 px-6 rounded-lg bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 active:scale-95 transition"
                  >
                    Salva Modifiche
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
