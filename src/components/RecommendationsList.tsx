import React, { useState, useEffect } from 'react';
import { Book, BookRecommendation } from '../types';
import { Sparkles, RefreshCw, Plus, Check, Loader, ThumbsUp, Layers, HelpCircle } from 'lucide-react';

interface RecommendationsListProps {
  books: Book[];
  recommendations: BookRecommendation[];
  onRefreshRecommendations: () => Promise<void>;
  onAddFromRecommendation: (rec: BookRecommendation) => void;
  addedBookTitles: string[]; // to show 'Già in Libreria'
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

  const loadingQuotes = [
    "Gemini sta studiando lo stile dei tuoi autori preferiti...",
    "Analisi dei tuoi voti e recensioni in corso...",
    "Confrontando i tuoi record con milioni di capolavori...",
    "Scoprendo gemme letterarie segrete che potresti amare...",
    "Unendo i fili narrativi della tua libreria...",
    "Creando un bouquet di romanzi su misura per te...",
  ];

  useEffect(() => {
    let intervalId: any;
    if (isRefreshing) {
      setPromptMsg(loadingQuotes[0]);
      let idx = 1;
      intervalId = setInterval(() => {
        setPromptMsg(loadingQuotes[idx % loadingQuotes.length]);
        idx++;
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [isRefreshing]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefreshRecommendations();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div id="recommendations-container" className="space-y-6">
      
      {/* Container Header */}
      <div id="rec-header" className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="text-red-500 w-5 h-5 animate-pulse" />
            Consigliati per Te dall'AI
          </h2>
          <p className="text-xs text-zinc-400">Analisi avanzata basata sulle tue recensioni, valutazioni e generi preferiti.</p>
        </div>
        <button
          id="btn-regenerate-recommendations"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-red-650 hover:bg-red-700 disabled:bg-zinc-900 text-white text-xs uppercase tracking-wider font-bold py-2.5 px-5 rounded-full flex items-center justify-center gap-2.5 transition shrink-0 active:scale-95 shadow-lg shadow-red-950/20 hover:shadow-red-900/40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Calcolo consenziente...' : 'Aggiorna Consigli AI'}
        </button>
      </div>

      {isRefreshing ? (
        // Reassuring AI processing screen
        <div className="py-16 bg-zinc-950/20 border border-zinc-900/60 rounded-2xl flex flex-col items-center justify-center text-center px-6 space-y-4">
          <div className="relative">
            <Loader className="w-14 h-14 text-red-500 animate-spin" />
            <Sparkles className="w-5 h-5 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Consulenza Letteraria con Gemini</h4>
            <p className="text-xs text-zinc-400 italic max-w-xs leading-relaxed">{promptMsg}</p>
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        // Fallback or empty advice state
        <div id="rec-empty" className="py-12 text-center bg-zinc-950/20 border border-zinc-900/60 rounded-2xl p-6 text-zinc-500 space-y-4 flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-zinc-700 animate-bounce" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Nessuna raccomandazione AI calcolata.</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">Tocca il pulsante in alto a destra per far sì che Gemini generi i tuoi consigli Netflix letterari personalizzati!</p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs bg-zinc-900 hover:bg-zinc-850 text-white font-bold tracking-widest uppercase py-2 px-5 rounded-full border border-zinc-850"
          >
            Genera Ora
          </button>
        </div>
      ) : (
        // Netflix Recommendations Rows Layout
        <div id="rec-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((rec, idx) => {
            const cleanTitle = rec.title.trim().toLowerCase();
            const alreadyInLibrary = addedBookTitles.some(title => title.toLowerCase() === cleanTitle);
            
            return (
              <div
                key={idx}
                className="group bg-zinc-900/40 border border-zinc-900 rounded-xl overflow-hidden shadow-md flex flex-col h-[400px] hover:scale-[1.03] hover:shadow-xl hover:shadow-black/60 transition duration-300 relative"
              >
                {/* Book Jacket background (Netflix Banner Style) */}
                <div className="h-32 bg-gradient-to-br from-zinc-850 via-zinc-900 to-black relative p-4 flex items-end justify-between border-b border-zinc-850">
                  <div className="absolute inset-0 bg-red-950/5 mix-blend-color-dodge pointer-events-none"></div>
                  
                  {/* Glowing match indicator */}
                  <div id="match-score" className="absolute top-3 left-3 bg-green-500/10 border border-green-500/20 py-0.5 px-2 rounded font-sans text-[10px] font-black tracking-wider text-green-400">
                    {rec.matchPercentage}% MATCH
                  </div>

                  {rec.pages && (
                    <div className="absolute top-3 right-3 text-zinc-500 text-[9px] font-bold font-mono">
                      {rec.pages} PAGINE
                    </div>
                  )}

                  {/* Aesthetic visual book placeholder */}
                  <div className="flex-1 min-w-0 pr-12">
                    <span className="text-[9px] px-1.5 py-0.5 bg-red-650 text-white rounded font-bold uppercase tracking-widest text-center select-none inline-block mb-1.5">
                      {rec.genre}
                    </span>
                    <h3 className="text-sm font-black text-white truncate font-serif">{rec.title}</h3>
                    <p className="text-[10px] text-zinc-400 truncate">di {rec.author}</p>
                  </div>

                  {/* Miniature 3D floating jacket */}
                  <div className="w-12 h-18 bg-zinc-900 rounded shadow-lg overflow-hidden flex flex-col justify-between text-white shrink-0 -mb-7 border border-white/10 relative z-10 transition group-hover:scale-110">
                    {rec.coverUrl ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={rec.coverUrl}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full p-1.5 flex flex-col justify-between bg-amber-800">
                        <div className="text-[5px] uppercase tracking-wide font-sans opacity-70 truncate">{rec.genre}</div>
                        <div className="text-[7px] font-bold font-serif leading-tight line-clamp-3">{rec.title}</div>
                        <div className="text-[5px] font-sans text-amber-200 truncate leading-none">AI Choice</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtext Body */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-950/50">
                  {/* Netflix Reason Block Description */}
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    
                    {/* Reason statement matching tastes */}
                    <div id="taste-reason" className="bg-zinc-900/80 border-l-2 border-amber-500 rounded p-2 text-[10px] text-zinc-300 leading-normal italic flex items-start gap-1">
                      <ThumbsUp className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-200">Perchè consigliato: </span>
                        {rec.reason}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans line-clamp-4">
                      {rec.description}
                    </p>
                  </div>

                  {/* Add recommended book button */}
                  <div className="mt-4 pt-3 border-t border-zinc-900 shrink-0">
                    {alreadyInLibrary ? (
                      <div className="w-full bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg flex items-center justify-center gap-2 border border-zinc-850 cursor-not-allowed select-none">
                        <Check className="w-3.5 h-3.5 text-zinc-650" /> Già in Libreria
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddFromRecommendation(rec)}
                        className="w-full bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-950/20 active:scale-95 text-white text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition duration-150"
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
    </div>
  );
}
