import React from 'react';
import { Book } from '../types';
import { BookOpen, Award, Layers, Star, TrendingUp, Calendar, Hash } from 'lucide-react';

interface StatsDashboardProps {
  books: Book[];
}

export default function StatsDashboard({ books }: StatsDashboardProps) {
  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.status === 'completed');
  const readingBooks = books.filter((b) => b.status === 'reading');
  const planningBooks = books.filter((b) => b.status === 'planning');

  // Calculates total pages read (either from fully completed or partial progression in reading books)
  const totalPagesRead = books.reduce((sum, b) => {
    if (b.status === 'completed') return sum + b.pages;
    if (b.status === 'reading') return sum + (b.currentPage || 0);
    return sum;
  }, 0);

  // Computes average rating
  const booksWithRating = completedBooks.filter((b) => b.rating !== undefined);
  const averageRating = booksWithRating.length > 0
    ? (booksWithRating.reduce((sum, b) => sum + (b.rating || 0), 0) / booksWithRating.length).toFixed(1)
    : "N/A";

  // 1. GENRES STATISTICS (Cosa ho letto)
  const genreCountMap: Record<string, number> = {};
  books.forEach((b) => {
    const g = b.genre || "Generico";
    genreCountMap[g] = (genreCountMap[g] || 0) + 1;
  });

  const genresData = Object.entries(genreCountMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalGenresCount = books.length || 1;

  // 2. TIMELINE STATISTICS: Books Completed per month (Quando ho letto)
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const monthlyData = Array(12).fill(0);
  
  completedBooks.forEach((book) => {
    if (book.endDate) {
      try {
        const parts = book.endDate.split('-');
        const monthIndex = parseInt(parts[1]) - 1; // YYYY-MM-DD
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyData[monthIndex]++;
        }
      } catch {}
    } else {
      // Fallback to May for mock if dates aren't defined
      monthlyData[4]++;
    }
  });

  // 3. RATINGS DISTRIBUTION (Come ho letto / Valutazione)
  const ratingsDistribution = Array(10).fill(0); // rating 1 to 10
  completedBooks.forEach((b) => {
    if (b.rating && b.rating >= 1 && b.rating <= 10) {
      ratingsDistribution[b.rating - 1]++;
    }
  });

  // Color arrays for graphs
  const PALETTE = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

  // SVG calculations for Genre Donut
  let cumulativePercent = 0;
  const donutSlices = genresData.map((g, idx) => {
    const percent = g.count / totalGenresCount;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;
    
    // Radians
    const x1 = Math.cos((startAngle - 90) * Math.PI / 180) * 45 + 50;
    const y1 = Math.sin((startAngle - 90) * Math.PI / 180) * 45 + 50;
    const x2 = Math.cos((endAngle - 90) * Math.PI / 180) * 45 + 50;
    const y2 = Math.sin((endAngle - 90) * Math.PI / 180) * 45 + 50;
    
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const d = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    
    return {
      d,
      color: PALETTE[idx % PALETTE.length],
      name: g.name,
      count: g.count,
    };
  });

  // Peaks calculation for Month chart scale
  const maxBooksInAMonth = Math.max(...monthlyData, 1);
  const maxRatingCount = Math.max(...ratingsDistribution, 1);

  return (
    <div id="stats-dashboard" className="space-y-8 bg-zinc-950/40 p-6 rounded-2xl border border-zinc-900 shadow-xl">
      
      {/* Title Header */}
      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
        <TrendingUp className="text-red-500 w-5 h-5" />
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Le mie Statistiche di Lettura</h2>
          <p className="text-xs text-zinc-400">Un riepilogo dettagliato del mio viaggio letterario.</p>
        </div>
      </div>

      {totalBooks === 0 ? (
        <div className="text-center py-12 text-zinc-500 space-y-2">
          <Layers className="w-12 h-12 mx-auto stroke-1 text-zinc-700 animate-pulse" />
          <p className="text-sm font-medium">Aggiungi qualche libro alla tua collezione per poter calcolare le statistiche!</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* A. KPI BANNER */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-500">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Libri Totali</span>
                <span className="text-2xl font-black text-white font-mono">{totalBooks}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">{completedBooks.length} letti, {readingBooks.length} in corso</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/30 text-amber-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Pagine Lette</span>
                <span className="text-2xl font-black text-amber-400 font-mono">{totalPagesRead}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Media {(totalPagesRead / totalBooks).toFixed(0)} pag./libro</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
              <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-905/30 text-yellow-500">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Voto Medio</span>
                <span className="text-2xl font-black text-yellow-450 font-mono">{averageRating}</span>
                <span className="text-[9px] text-zinc-450 block mt-0.5">su {booksWithRating.length} recensioni</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center gap-3.5 shadow-md">
              <div className="p-3 rounded-lg bg-pink-950/40 border border-pink-909/30 text-pink-500">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Genere Top</span>
                <span className="text-lg font-bold text-pink-400 truncate max-w-[110px] block mt-0.5">
                  {genresData[0]?.name || "Nessuno"}
                </span>
                <span className="text-[9px] text-zinc-450 block">{genresData[0]?.count || 0} libri catalogati</span>
              </div>
            </div>
          </div>

          {/* B. DETAILED GRAPHS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* GRAPH 1: GENRE DISTRIBUTION (Donut chart + Legend) */}
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Layers className="w-3.5 h-3.5 text-red-500" /> Distribuzione Generi
              </h4>
              
              <div className="flex flex-col items-center justify-center pt-2">
                {/* SVG Visual Circle */}
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-zinc-800" strokeWidth="8" />
                    {donutSlices.map((slice, i) => (
                      <path
                        key={i}
                        d={slice.d}
                        fill={slice.color}
                        className="hover:opacity-85 transition cursor-pointer"
                      />
                    ))}
                    {/* Inner core hole to make it a donut */}
                    <circle cx="50" cy="50" r="30" className="fill-zinc-950" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-zinc-400 font-bold uppercase font-mono tracking-wider">Generi</span>
                    <span className="text-lg font-black text-white">{genresData.length}</span>
                  </div>
                </div>

                {/* Legend listing */}
                <div className="w-full mt-5 space-y-2 max-h-36 overflow-y-auto pr-1">
                  {donutSlices.slice(0, 5).map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                        <span className="text-zinc-300 font-medium truncate capitalize">{s.name}</span>
                      </div>
                      <span className="font-bold text-zinc-500 font-mono">
                        {s.count} {s.count === 1 ? 'libro' : 'libri'}
                      </span>
                    </div>
                  ))}
                  {genresData.length > 5 && (
                    <div className="text-[10px] text-center text-zinc-500 italic">
                      + altri {genresData.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GRAPH 2: MONTHLY COMPLETIONS (Quando ho letto) */}
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl space-y-4 col-span-1 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Libri Completati nel 2026 (Mensile)
              </h4>

              {/* Bar charts representing Monthly completion amounts */}
              <div className="flex h-44 items-end gap-1.5 pt-4 px-2 relative">
                {monthlyData.map((val, idx) => {
                  const percentage = (val / maxBooksInAMonth) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      
                      {/* Tooltop showing book volumes */}
                      <span className="opacity-0 group-hover:opacity-100 bg-red-650 text-[9px] text-white font-bold py-0.5 px-1.5 rounded-md absolute -translate-y-6 transition duration-150 font-mono z-10 shadow-lg border border-red-500/20">
                        {val} {val === 1 ? 'libro' : 'libri'}
                      </span>
                      
                      {/* Glowing Columns */}
                      <div
                        style={{ height: `${percentage}%` }}
                        className="w-full rounded-t-sm transition-all duration-500 bg-gradient-to-t from-red-600/60 to-red-500 hover:from-amber-500/80 hover:to-amber-500 shadow-[0_-2px_6px_rgba(239,68,68,0.2)]"
                      ></div>

                      {/* Month short code label */}
                      <span className="text-[10px] text-zinc-500 font-mono font-bold mt-2 pt-1 uppercase tracking-tighter">
                        {monthNames[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRAPH 3: RATINGS HISTOGRAM (Come ho letto / Valutazione) */}
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl space-y-4 col-span-1 md:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Star className="w-3.5 h-3.5 text-yellow-500" /> Distribuzione del Mio Gradimento (Valutazione 1-10)
              </h4>

              {/* Horizontal frequencies layout */}
              <div className="space-y-2.5 pt-2">
                {ratingsDistribution.map((count, idx) => {
                  const ratingVal = idx + 1;
                  const ratio = (count / maxRatingCount) * 100 || 0;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      
                      {/* Left score index indicator */}
                      <span className="w-12 text-zinc-400 font-bold font-mono text-right flex items-center justify-end gap-1 shrink-0 select-none">
                        <span>★ {ratingVal}</span>
                      </span>

                      {/* Progress bar representer */}
                      <div className="flex-1 bg-zinc-900/80 h-3 rounded overflow-hidden relative">
                        {count > 0 && (
                          <div
                            style={{ width: `${ratio}%` }}
                            className="bg-gradient-to-r from-yellow-650 to-yellow-500 h-full rounded transition-all duration-500 shadow-inner"
                          ></div>
                        )}
                      </div>

                      {/* Right direct count text */}
                      <span className="w-14 text-zinc-500 font-semibold font-mono text-left shrink-0">
                        {count > 0 ? `${count} ${count === 1 ? 'libro' : 'libri'}` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
