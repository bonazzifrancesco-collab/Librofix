import React, { useState } from 'react';
import { Book, BookRecommendation } from '../types';
import { Sparkles, RefreshCw, Plus, Check, Loader, ThumbsUp, X, BookOpen, ShoppingCart, ExternalLink } from 'lucide-react';

interface RecommendationsListProps {
  books: Book[];
  recommendations: BookRecommendation[];
  onRefreshRecommendations: () => Promise<void>;
  onAddFromRecommendation: (rec: BookRecommendation) => void;
  addedBookTitles: string[];
}

interface BookDetail {
  description: string;
  googleLink: string;
  amazonLink: string;
  ibsLink: string;
  publishedDate: string;
  publisher: string;
  loading: boolean;
}

export default function RecommendationsList({
  books,
  recommendations,
  onRefreshRecommendations,
  onAddFromRecommendation,
  addedBookTitles,
}: RecommendationsListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [promptMsg, setPromptMsg] = useState('');
  const [selectedRec, setSelectedRec] = useState<BookRecommendation | null>(null);
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);

  const loadingQuotes = [
    "Claude sta studiando lo stile dei tuoi autori preferiti...",
    "Analisi dei tuoi voti e recensioni in corso...",
    "Confrontando i tuoi gusti con migliaia di capolavori...",
    "Scoprendo gemme letterarie che potresti amare...",
    "Creando un bouquet di romanzi su misura per te...",
  ];

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setPromptMsg(loadingQuotes[0]);
      let idx = 1;
      const intervalId = setInterval(() => {
        setPromptMsg(loadingQuotes[idx % loadingQuotes.length]);
        idx++;
      }, 3000);
      await onRefreshRecommendations();
      clearInterval(intervalId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDetail = async (rec: BookRecommendation) => {
    setSelectedRec(rec);
    setBookDetail({ description: '', googleLink: '', amazonLink: '', ibsLink: '', publishedDate: '', publisher: '', loading: true });

    try {
      const key = '';
      const query = encodeURIComponent(`${rec.title} ${rec.author}`);
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
      const data = await res.json();

      if (data.items?.[0]) {
        const info = data.items[0].volumeInfo;
        const titleSlug = encodeURIComponent(rec.title);
        const authorSlug = encodeURIComponent(rec.author);

        setBookDetail({
          description: info.description || rec.description || 'Nessuna trama disponibile.',
          googleLink: info.infoLink || `https://books.google.com/books?q=${query}`,
          amazonLink: `https://www.amazon.it/s?k=${titleSlug}+${authorSlug}`,
          ibsLink: `https://www.ibs.it/libri/ricerca?ts=libri&query=${titleSlug}+${authorSlug}`,
          publishedDate: info.publishedDate || '',
          publisher: info.publisher || '',
          loading: false,
        });
      } else {
        const titleSlug = encodeURIComponent(rec.title);
        const authorSlug = encodeURIComponent(rec.author);
        setBookDetail({
          description: rec.description || 'Nessuna trama disponibile.',
          googleLink: `https://books.google.com/books?q=${query}`,
          amazonLink: `https://www.amazon.it/s?k=${titleSlug}+${authorSlug}`,
          ibsLink: `https://www.ibs.it/libri/ricerca?ts=libri&query=${titleSlug}+${authorSlug}`,
          publishedDate: '',
          publisher: '',
          loading: false,
        });
      }
    } catch {
      setBookDetail({
        description: rec.description || 'Nessuna trama disponibile.',
        googleLink: '',
        amazonLink: `https://www.amazon.it/s?k=${encodeURIComponent(rec.title)}`,
        ibsLink: `https://www.ibs.it/libri/ricerca?ts=libri&query=${encodeURIComponent(rec.title)}`,
        publishedDate: '',
        publisher: '',
        loading: false,
      });
    }
  };

  const closeDetail = () => {
    setSelectedRec(null);
    setBookDetail(null);
  };

  const cleanTitle = (t: string) => t.trim().toLowerCase();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="text-red-500 w-5 h-5 animate-pulse" />
            Consigliati per Te dall'AI
          </h2>
          <p className="text-xs text-zinc-400">Analisi avanzata basata sulle tue recensioni, valutazioni e generi preferiti.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 text-white text-xs uppercase tracking-wider font-bold py-2.5 px-5 rounded-full flex items-center justify-center gap-2.5 transition shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Calcolo in corso...' : 'Aggiorna Consigli AI'}
        </button>
      </div>

      {isRefreshing ? (
        <div className="py-16 bg-zinc-950/20 border border-zinc-900/60 rounded-2xl flex flex-col items-center justify-center text-center px-6 space-y-4">
          <div className="relative">
            <Loader className="w-14 h-14 text-red-500 animate-spin" />
            <Sparkles className="w-5 h-5 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Consulenza Letteraria AI</h4>
            <p className="text-xs text-zinc-400 italic leading-relaxed">{promptMsg}</p>
          </div>
        </div>

      ) : recommendations.length === 0 ? (
        <div className="py-12 text-center bg-zinc-950/20 border border-zinc-900/60 rounded-2xl p-6 text-zinc-500 space-y-4 flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-zinc-700 animate-bounce" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Nessuna raccomandazione AI calcolata.</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">Tocca il pulsante per generare i tuoi consigli letterari personalizzati!</p>
          </div>
          <button onClick={handleRefresh} className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-widest uppercase py-2 px-5 rounded-full border border-zinc-800">
            Genera Ora
          </button>
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((rec, idx) => {
            const alreadyInLibrary = addedBookTitles.some(t => cleanTitle(t) === cleanTitle(rec.title));
            return (
              <div
                key={idx}
                onClick={() => openDetail(rec)}
                className="group bg-zinc-900/40 border border-zinc-900 rounded-xl overflow-hidden shadow-md flex flex-col h-[400px] hover:scale-[1.03] hover:shadow-xl hover:shadow-black/60 transition duration-300 cursor-pointer"
              >
                {/* Card header */}
                <div className="h-32 bg-gradient-to-br from-zinc-850 via-zinc-900 to-black relative p-4 flex items-end justify-between border-b border-zinc-800">
                  <div className="absolute top-3 left-3 bg-green-500/10 border border-green-500/20 py-0.5 px-2 rounded text-[10px] font-black tracking-wider text-green-400">
                    {rec.matchPercentage}% MATCH
                  </div>
                  {rec.pages && <div className="absolute top-3 right-3 text-zinc-500 text-[9px] font-bold font-mono">{rec.pages} PAG.</div>}
                  <div className="flex-1 min-w-0 pr-12">
                    <span className="text-[9px] px-1.5 py-0.5 bg-red-600 text-white rounded font-bold uppercase tracking-widest inline-block mb-1.5">{rec.genre}</span>
                    <h3 className="text-sm font-black text-white truncate font-serif">{rec.title}</h3>
                    <p className="text-[10px] text-zinc-400 truncate">di {rec.author}</p>
                  </div>
                  <div className="w-12 h-18 bg-zinc-900 rounded shadow-lg overflow-hidden shrink-0 -mb-7 border border-white/10 relative z-10 transition group-hover:scale-110">
                    {rec.coverUrl ? (
                      <img referrerPolicy="no-referrer" src={rec.coverUrl} alt={rec.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full p-1.5 flex flex-col justify-between bg-amber-800">
                        <div className="text-[5px] uppercase opacity-70 truncate">{rec.genre}</div>
                        <div className="text-[7px] font-bold font-serif leading-tight line-clamp-3">{rec.title}</div>
                        <div className="text-[5px] text-amber-200">AI</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-950/50">
                  <div className="space-y-3 flex-1 overflow-hidden">
                    <div className="bg-zinc-900/80 border-l-2 border-amber-500 rounded p-2 text-[10px] text-zinc-300 leading-normal italic flex items-start gap-1">
                      <ThumbsUp className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <div><span className="font-bold text-amber-200 not-italic">Perché consigliato: </span>{rec.reason}</div>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{rec.description}</p>
                    <p className="text-[9px] text-zinc-600 italic">↗ Clicca per trama completa e prezzi</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-900 shrink-0" onClick={e => e.stopPropagation()}>
                    {alreadyInLibrary ? (
                      <div className="w-full bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg flex items-center justify-center gap-2 border border-zinc-800 cursor-not-allowed">
                        <Check className="w-3.5 h-3.5" /> Già in Libreria
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddFromRecommendation(rec)}
                        className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Aggiungi ai Desiderati
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal dettaglio */}
      {selectedRec && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header modal con copertina */}
            <div className="relative shrink-0">
              {selectedRec.coverUrl ? (
                <div className="h-48 overflow-hidden relative">
                  <img referrerPolicy="no-referrer" src={selectedRec.coverUrl} alt={selectedRec.title} className="w-full h-full object-cover opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-br from-red-950/40 to-zinc-900" />
              )}
              <button onClick={closeDetail} className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full transition">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] px-2 py-0.5 bg-red-600 text-white rounded font-bold uppercase tracking-widest">{selectedRec.genre}</span>
                  <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">{selectedRec.matchPercentage}% MATCH</span>
                  {selectedRec.pages && <span className="text-zinc-500 text-[10px]">{selectedRec.pages} pag.</span>}
                </div>
                <h2 className="text-xl font-black text-white font-serif">{selectedRec.title}</h2>
                <p className="text-sm text-zinc-400">di {selectedRec.author}</p>
                {bookDetail?.publishedDate && <p className="text-[10px] text-zinc-500 mt-0.5">{bookDetail.publisher} · {bookDetail.publishedDate.slice(0, 4)}</p>}
              </div>
            </div>

            {/* Body modal scrollabile */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Perché consigliato */}
              <div className="bg-zinc-900/80 border-l-2 border-amber-500 rounded p-3 text-xs text-zinc-300 leading-relaxed italic">
                <span className="font-bold text-amber-200 not-italic">Perché ti piacerà: </span>{selectedRec.reason}
              </div>

              {/* Trama */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Trama
                </h4>
                {bookDetail?.loading ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Loader className="w-4 h-4 animate-spin" /> Caricamento trama da Google Books...
                  </div>
                ) : (
                  <p className="text-sm text-zinc-300 leading-relaxed">{bookDetail?.description || selectedRec.description}</p>
                )}
              </div>

              {/* Link acquisto */}
              {!bookDetail?.loading && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" /> Dove Acquistare
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {bookDetail?.amazonLink && (
                      
                        href={bookDetail.amazonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg p-2.5 transition text-center"
                      >
                        <span className="text-lg">📦</span>
                        <span className="text-[10px] font-bold text-amber-300">Amazon</span>
                        <ExternalLink className="w-3 h-3 text-amber-500" />
                      </a>
                    )}
                    {bookDetail?.ibsLink && (
                      
                        href={bookDetail.ibsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg p-2.5 transition text-center"
                      >
                        <span className="text-lg">📚</span>
                        <span className="text-[10px] font-bold text-blue-300">IBS</span>
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      </a>
                    )}
                    {bookDetail?.googleLink && (
                      
                        href={bookDetail.googleLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 transition text-center"
                      >
                        <span className="text-lg">🔍</span>
                        <span className="text-[10px] font-bold text-zinc-300">Google Books</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="p-4 border-t border-zinc-800 flex gap-3 shrink-0">
              <button onClick={closeDetail} className="flex-1 text-xs font-bold uppercase text-zinc-400 hover:text-white py-2.5 px-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition">
                Chiudi
              </button>
              {!addedBookTitles.some(t => cleanTitle(t) === cleanTitle(selectedRec.title)) && (
                <button
                  onClick={() => { onAddFromRecommendation(selectedRec); closeDetail(); }}
                  className="flex-1 text-xs font-bold uppercase text-white py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi ai Desiderati
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
