import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Check, Award, Flame, Navigation, Plus, LayoutGrid, Library, Star } from 'lucide-react';

interface BookShelfProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenAddModal: (initialStatus?: 'planning' | 'reading' | 'completed') => void;
}

export default function BookShelf({ books, onSelectBook, onOpenAddModal }: BookShelfProps) {
  const [viewMode, setViewMode] = useState<'poster' | 'spine'>('poster');

  // Group books by status
  const readingBooks = books.filter((b) => b.status === 'reading');
  const planningBooks = books.filter((b) => b.status === 'planning');
  const completedBooks = books.filter((b) => b.status === 'completed');

  return (
    <div id="book-shelf-container" className="space-y-12">
      
      {/* 0. VIEW MODE SWITCHER TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-900/40 p-3 rounded-xl border border-white/5 backdrop-blur-sm shadow-lg">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">La Mia Videoteca Letteraria</h2>
          <p className="text-xs text-slate-400">Personalizza l'apparenza della tua libreria su Libroflix</p>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setViewMode('poster')}
            className={`px-3 py-1.5 rounded-md text-xs font-black tracking-wider uppercase transition flex items-center gap-1.5 ${
              viewMode === 'poster'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Copertine (Poster)
          </button>
          <button
            onClick={() => setViewMode('spine')}
            className={`px-3 py-1.5 rounded-md text-xs font-black tracking-wider uppercase transition flex items-center gap-1.5 ${
              viewMode === 'spine'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Library className="w-3.5 h-3.5" /> Scaffali 3D (Coste)
          </button>
        </div>
      </div>

      {/* 1. SECTION: LIBRI IN LETTURA */}
      <div id="shelf-reading" className="relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <BookOpen className="text-amber-500 w-5 h-5 animate-pulse" />
            In Lettura <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">{readingBooks.length}</span>
          </h3>
          {readingBooks.length === 0 && (
            <button
              id="btn-add-reading"
              onClick={() => onOpenAddModal('reading')}
              className="text-xs flex items-center gap-1 text-amber-400 hover:text-white transition bg-amber-900/40 hover:bg-amber-900/70 py-1 px-3 rounded-full border border-amber-500/30"
            >
              <Plus className="w-3.5 h-3.5" /> Inizia un libro
            </button>
          )}
        </div>

        {/* Shelf Body */}
        <div className="relative min-h-[220px] rounded-xl bg-zinc-900/30 border border-zinc-800/50 p-6 flex flex-wrap gap-8 items-end justify-start overflow-visible shadow-inner">
          {readingBooks.length === 0 ? (
            <div className="w-full text-center py-8 text-zinc-500 flex flex-col items-center justify-center gap-2">
              <div className="text-2xl">📖</div>
              <p className="text-sm">Nessun libro in lettura al momento. Apri uno dallo scaffale o scansionane uno nuovo!</p>
            </div>
          ) : viewMode === 'poster' ? (
            /* Poster View Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full">
              {readingBooks.map((book) => {
                const percentage = Math.round((book.currentPage / book.pages) * 100) || 0;
                return (
                  <div
                    key={book.id}
                    onClick={() => onSelectBook(book)}
                    className="group relative aspect-[2/3] bg-zinc-900 rounded-xl border border-zinc-850 overflow-hidden cursor-pointer shadow-lg hover:scale-105 hover:shadow-black/80 hover:border-red-600 transition duration-300 flex flex-col justify-between"
                  >
                    {book.coverUrl ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:opacity-90 transition duration-300"
                        onError={(e) => {
                          // Fail-safe fallback if the image fails loading
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{ backgroundColor: book.spineColor }}
                        className="w-full h-full p-3.5 flex flex-col justify-between text-white relative"
                      >
                        <div className="absolute inset-0 bg-black/35 mix-blend-multiply"></div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-black/40 text-zinc-200 rounded font-bold uppercase tracking-widest text-center select-none inline-block max-w-[80px] truncate relative z-10 w-fit">
                          {book.genre}
                        </span>
                        <div className="relative z-10 text-xs font-serif font-black line-clamp-3 leading-tight mt-1 text-center">
                          {book.title}
                        </div>
                        <div className="relative z-10 text-[9px] text-zinc-300 font-sans text-center truncate italic">
                          {book.author}
                        </div>
                      </div>
                    )}
                    {/* Progress Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 select-none">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-200 mb-1">
                        <span>Progresso</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/15 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Immersive 3D Book Layout */
            readingBooks.map((book) => {
              const percentage = Math.round((book.currentPage / book.pages) * 100) || 0;
              return (
                <div
                  id={`open-book-${book.id}`}
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group relative w-full md:w-[360px] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 z-10"
                >
                  <div className="flex h-44 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-150 text-zinc-900 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-amber-900/20 relative">
                    {/* Left Page (Visual Cover & Embossing) */}
                    <div className="w-1/2 bg-[#fcfcfa] p-3 flex flex-col justify-between border-r border-[#deded9] shadow-[inset_-10px_0_15px_rgba(0,0,0,0.08)] relative">
                      <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-zinc-200 to-transparent"></div>
                      
                      {book.coverUrl ? (
                        <div className="w-full h-full rounded-md overflow-hidden shadow-sm relative">
                          <img
                            referrerPolicy="no-referrer"
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          style={{ backgroundColor: book.spineColor }}
                          className="w-full h-full rounded-md flex flex-col justify-between p-2 text-white relative shadow-sm"
                        >
                          <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{book.genre}</div>
                          <div className="text-sm font-serif line-clamp-3 leading-tight">{book.title}</div>
                          <div className="text-[10px] font-medium truncate opacity-90">{book.author}</div>
                        </div>
                      )}
                    </div>

                    {/* Right Page (Book Info & Live Reading Progress) */}
                    <div className="w-1/2 bg-[#fafaf7] p-4 flex flex-col justify-between relative shadow-[inset_10px_0_15px_rgba(0,0,0,0.08)]">
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-zinc-200 to-transparent"></div>
                      
                      <div className="space-y-1">
                        <div className="text-[10px] text-red-600 font-bold tracking-widest uppercase">{book.genre}</div>
                        <h4 className="text-sm font-bold font-serif line-clamp-2 text-zinc-800 leading-snug group-hover:text-red-700 transition">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 font-medium truncate">di {book.author}</p>
                      </div>

                      {/* Reading Progress details */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-600">
                          <span>Progresso</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-[9px] text-zinc-400 font-mono flex justify-between">
                          <span>pag. {book.currentPage}</span>
                          <span>tot. {book.pages}</span>
                        </div>
                      </div>
                    </div>

                    {/* Depth Pages Shadows Layer (Book Thickness) */}
                    <div className="absolute bottom-0 left-2 right-2 h-1 bg-zinc-300 rounded-b shadow-sm"></div>
                    <div className="absolute bottom-[-2px] left-4 right-4 h-1 bg-zinc-400 rounded-b shadow-md"></div>
                  </div>

                  {/* Bookmark ribbon visual decorator */}
                  <div className="absolute top-0 right-10 w-3 h-12 bg-red-600 shadow-md transform -skew-y-6 origin-top group-hover:h-16 transition-all duration-300"></div>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic wooden plank shelf line */}
        <div className="absolute left-0 right-0 bottom-[-10px] h-3 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.6)] border-b-2 border-amber-900"></div>
      </div>

      {/* 2. SECTION: LIBRI DA LEGGERE */}
      <div id="shelf-planning" className="relative pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <Flame className="text-orange-500 w-5 h-5" />
            Da Leggere / Lista dei Desideri <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-semibold">{planningBooks.length}</span>
          </h3>
          <button
            id="btn-add-planning"
            onClick={() => onOpenAddModal('planning')}
            className="text-xs flex items-center gap-1 text-orange-400 hover:text-white transition bg-orange-900/40 hover:bg-orange-900/70 py-1 px-3 rounded-full border border-orange-500/30"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi Desiderato
          </button>
        </div>

        {/* Shelf Grid container */}
        <div className="relative min-h-[220px] rounded-xl bg-zinc-900/20 border border-zinc-800/40 p-4 pt-8 pb-3 flex flex-wrap gap-1.5 items-end justify-start overflow-visible shadow-inner">
          {planningBooks.length === 0 ? (
            <div className="w-full text-center py-10 text-zinc-500 flex flex-col items-center justify-center gap-1">
              <span className="text-xl">📚</span>
              <p className="text-sm">Nessun libro da leggere. Clicca "+" o usa l'AI per iniziare la tua lista dei desideri!</p>
            </div>
          ) : viewMode === 'poster' ? (
            /* Poster View Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full">
              {planningBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group relative aspect-[2/3] bg-zinc-900 rounded-xl border border-zinc-850 overflow-hidden cursor-pointer shadow-lg hover:scale-105 hover:shadow-black/80 hover:border-orange-500 transition duration-300 flex flex-col justify-between"
                >
                  {book.coverUrl ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:opacity-90 transition duration-300"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: book.spineColor }}
                      className="w-full h-full p-3.5 flex flex-col justify-between text-white relative"
                    >
                      <div className="absolute inset-0 bg-black/35 mix-blend-multiply"></div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black/40 text-zinc-200 rounded font-bold uppercase tracking-widest text-center select-none inline-block max-w-[80px] truncate relative z-10 w-fit">
                        {book.genre}
                      </span>
                      <div className="relative z-10 text-xs font-serif font-black line-clamp-3 leading-tight mt-1 text-center">
                        {book.title}
                      </div>
                      <div className="relative z-10 text-[9px] text-zinc-300 font-sans text-center truncate italic">
                        {book.author}
                      </div>
                    </div>
                  )}
                  {/* Whislist Label Badge overlay */}
                  <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-[8px] font-black px-2 py-0.5 rounded shadow text-white tracking-widest uppercase">
                    WISH
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Standing Spines Library view */
            planningBooks.map((book) => (
              <div
                id={`spine-${book.id}`}
                key={book.id}
                onClick={() => onSelectBook(book)}
                title={`"${book.title}" di ${book.author}`}
                style={{
                  height: `${book.spineHeight}px`,
                  backgroundColor: book.spineColor,
                }}
                className={`w-9 sm:w-11 md:w-12 rounded-t-md relative flex flex-col justify-between py-4 text-white shadow-[2px_0_5px_rgba(0,0,0,0.4),inset_2px_2px_4px_rgba(255,255,255,0.15),inset_-2px_-2px_4px_rgba(0,0,0,0.3)] hover:shadow-[-5px_10px_20px_rgba(0,0,0,0.6),inset_2px_2px_4px_rgba(255,255,255,0.25)] transition-all duration-300 cursor-pointer hover:scale-105 hover:-translate-y-4 hover:-rotate-1 z-10 hover:z-20 border-t border-r border-amber-100/10 origin-bottom group`}
              >
                <div className="absolute top-2 left-0 right-0 h-1 border-y border-amber-300/30"></div>
                <div className="absolute top-[14px] left-0 right-0 h-0.5 bg-amber-300/25"></div>
                
                {book.spineStyle === 'fancy' && (
                  <div className="absolute top-5 left-1 right-1 h-3 rounded-sm bg-black/20 border border-amber-300/10 flex items-center justify-center text-[7px] font-bold tracking-widest text-amber-200">
                    ★
                  </div>
                )}

                <div className="flex-1 flex items-center justify-center overflow-hidden my-4 px-1 select-none">
                  <div className="font-serif text-[11px] sm:text-[12px] font-bold tracking-wide whitespace-nowrap rotate-90 transform origin-center text-center capitalize w-full opacity-90 group-hover:opacity-100 transition">
                    <span className="truncate max-w-[100px] inline-block">{book.title}</span>
                  </div>
                </div>

                <div className="mt-auto px-1 flex flex-col items-center">
                  <span className="text-[7px] uppercase tracking-wider font-sans font-semibold opacity-75 max-w-[32px] truncate text-center leading-none">
                    {book.author.split(' ').pop()}
                  </span>
                  <div className="w-full h-1 mt-1 bg-black/30 border-t border-white/5"></div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-black/20 to-transparent"></div>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic wooden plank shelf line */}
        <div className="absolute left-0 right-0 bottom-[-10px] h-3 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.6)] border-b-2 border-amber-900"></div>
      </div>

      {/* 3. SECTION: LIBRI COMPLETATI */}
      <div id="shelf-completed" className="relative pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <Award className="text-yellow-500 w-5 h-5" />
            Letti e Finiti <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-semibold">{completedBooks.length}</span>
          </h3>
          <button
            id="btn-add-completed"
            onClick={() => onOpenAddModal('completed')}
            className="text-xs flex items-center gap-1 text-yellow-500 hover:text-white transition bg-yellow-950/40 hover:bg-yellow-950/70 py-1 px-3 rounded-full border border-yellow-500/30"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi Letto
          </button>
        </div>

        {/* Shelf Grid container */}
        <div className="relative min-h-[220px] rounded-xl bg-zinc-900/20 border border-zinc-800/40 p-4 pt-8 pb-3 flex flex-wrap gap-1.5 items-end justify-start overflow-visible shadow-inner">
          {completedBooks.length === 0 ? (
            <div className="w-full text-center py-10 text-zinc-500 flex flex-col items-center justify-center gap-1">
              <span className="text-xl">🎓</span>
              <p className="text-sm">Ancora nessun libro completato. Segna un libro come "Terminato" per vederlo qui!</p>
            </div>
          ) : viewMode === 'poster' ? (
            /* Poster View Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full">
              {completedBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group relative aspect-[2/3] bg-zinc-900 rounded-xl border border-zinc-850 overflow-hidden cursor-pointer shadow-lg hover:scale-105 hover:shadow-black/80 hover:border-yellow-500 transition duration-300 flex flex-col justify-between"
                >
                  {book.coverUrl ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:opacity-90 transition duration-300"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: book.spineColor }}
                      className="w-full h-full p-3.5 flex flex-col justify-between text-white relative"
                    >
                      <div className="absolute inset-0 bg-black/35 mix-blend-multiply"></div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black/40 text-zinc-200 rounded font-bold uppercase tracking-widest text-center select-none inline-block max-w-[80px] truncate relative z-10 w-fit">
                        {book.genre}
                      </span>
                      <div className="relative z-10 text-xs font-serif font-black line-clamp-3 leading-tight mt-1 text-center">
                        {book.title}
                      </div>
                      <div className="relative z-10 text-[9px] text-zinc-300 font-sans text-center truncate italic">
                        {book.author}
                      </div>
                    </div>
                  )}
                  {/* Completed star check badge overlays */}
                  <div className="absolute top-2.5 left-2.5 bg-green-600 border border-green-500/20 text-white text-[8px] font-black rounded px-1.5 py-0.5 shadow flex items-center justify-center gap-0.5 shrink-0 select-none">
                    COMPLETATO ✓
                  </div>
                  {book.rating && (
                    <div className="absolute top-2.5 right-2.5 bg-black/85 text-amber-400 text-[10px] font-black rounded px-1.5 py-0.5 border border-zinc-850 flex items-center gap-0.5 shadow">
                      ★ {book.rating}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Immersive Spines gold-bound complete books */
            completedBooks.map((book) => (
              <div
                id={`completed-${book.id}`}
                key={book.id}
                onClick={() => onSelectBook(book)}
                title={`"${book.title}" di ${book.author} — Voto: ${book.rating || 'nessuno'}/10`}
                style={{
                  height: `${book.spineHeight}px`,
                  backgroundColor: book.spineColor,
                }}
                className={`w-9 sm:w-11 md:w-12 rounded-t-md relative flex flex-col justify-between py-4 text-white shadow-[2px_0_5px_rgba(0,0,0,0.45),inset_2px_2px_4px_rgba(255,255,255,0.15),inset_-2px_-2px_4px_rgba(0,0,0,0.35)] hover:shadow-[-5px_10px_25px_rgba(0,0,0,0.6),inset_2px_2px_4px_rgba(255,255,255,0.25)] transition-all duration-300 cursor-pointer hover:scale-105 hover:-translate-y-4 hover:rotate-1 z-10 hover:z-20 border-t border-r border-amber-100/10 origin-bottom group`}
              >
                <div className="absolute top-1 left-1 bg-yellow-500/90 text-black text-[7px] font-black rounded-full px-1 w-4 h-4 flex items-center justify-center shadow">
                  ✓
                </div>

                <div className="absolute bottom-6 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 opacity-60"></div>
                
                {book.rating && (
                  <div className="absolute top-[85px] left-0 right-0 text-center font-mono font-black text-[9px] text-yellow-250 opacity-80 group-hover:opacity-100 tracking-tighter">
                    ★{book.rating}
                  </div>
                )}

                <div className="flex-1 flex items-center justify-center overflow-hidden my-4 px-1 select-none">
                  <div className="font-serif text-[11px] sm:text-[12px] font-bold tracking-wide whitespace-nowrap rotate-90 transform origin-center text-center capitalize w-full opacity-95">
                    <span className="truncate max-w-[90px] inline-block">{book.title}</span>
                  </div>
                </div>

                <div className="mt-auto px-1 flex flex-col items-center">
                  <span className="text-[7px] uppercase tracking-widest font-sans font-bold text-yellow-200 opacity-80 max-w-[32px] truncate text-center leading-none">
                    {book.author.split(' ').pop()}
                  </span>
                  <div className="w-full h-1 mt-1 bg-black/40 border-t border-white/5"></div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-black/2 w-transparent"></div>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-l from-white/10 to-transparent"></div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic wooden plank shelf line */}
        <div className="absolute left-0 right-0 bottom-[-10px] h-3 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.6)] border-b-2 border-amber-900"></div>
      </div>
    </div>
  );
}
