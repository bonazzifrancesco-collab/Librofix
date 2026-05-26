import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '../types';
import { Flame, RefreshCw, Plus } from 'lucide-react';

interface NewReleasesProps {
  books: Book[];
}

export default function NewReleases({ books }: NewReleasesProps) {
  const [newBooks, setNewBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const preferredGenres = useMemo(() => {
    if (books.length === 0) return ['Romanzo', 'Thriller', 'Fantasy'];
    const counts: Record<string, number> = {};
    books.forEach(b => { counts[b.genre] = (counts[b.genre] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
  }, [books]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/book/newreleases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres: preferredGenres }),
      });
      const data = await res.json();
      setNewBooks(data.books || []);
      setLoaded(true);
    } catch {
      setNewBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ownedTitles = books.map(b => b.title.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Flame className="text-orange-500 w-5 h-5" />
            Novità per Te
          </h2>
          <p className="text-xs text-zinc-400">
            Ultimi libri pubblicati nei tuoi generi preferiti: {preferredGenres.join(', ')}
          </p>
        </div>
        <button onClick={load} disabled={isLoading}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-full flex items-center gap-2 transition">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-4 text-zinc-500">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm">Caricamento novità in corso...</p>
        </div>
      ) : newBooks.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <p>Nessuna novità trovata. Riprova più tardi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {newBooks.map((book, idx) => {
            const owned = ownedTitles.includes(book.title.toLowerCase());
            return (
              <div key={idx} className="group relative bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden hover:scale-105 transition duration-300 shadow-md">
                <div className="aspect-[2/3] relative overflow-hidden">
                  {book.coverUrl ? (
                    <img referrerPolicy="no-referrer" src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-2xl">📚</div>
                  )}
                  {owned && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">GIÀ LETTO</div>
                  )}
                  {book.publishedDate && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-[8px] text-zinc-300 font-mono">{book.publishedDate.slice(0, 4)}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">{book.title}</p>
                  <p className="text-[9px] text-zinc-500 truncate">{book.author}</p>
                  <span className="text-[8px] px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded inline-block">{book.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
