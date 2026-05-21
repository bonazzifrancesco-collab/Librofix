import React, { useState, useEffect } from 'react';
import { Book, BookRecommendation } from './types';
import BookShelf from './components/BookShelf';
import ScannerModal from './components/ScannerModal';
import AddBookModal from './components/AddBookModal';
import BookDetailsModal from './components/BookDetailsModal';
import StatsDashboard from './components/StatsDashboard';
import RecommendationsList from './components/RecommendationsList';
import { Sparkles, BookOpen, Layers, TrendingUp, Camera, Plus, HelpCircle, Info } from 'lucide-react';

const SEED_BOOKS: Book[] = [
  {
    id: 'seed-1',
    title: 'Il Nome della Rosa',
    author: 'Umberto Eco',
    genre: 'Storico',
    pages: 512,
    currentPage: 512,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1585806655i/52834316.jpg',
    status: 'completed',
    startDate: '2026-04-10',
    endDate: '2026-04-28',
    rating: 10,
    review: 'Un capolavoro assoluto che intreccia sapientemente giallo medievale, filosofia, teologia ed ermeneutica. Umberto Eco crea un\'atmosfera claustrofobica e magnetica tra i corridoi labirintici della biblioteca benedettina. Consigliatissimo!',
    spineColor: '#5c2020',
    spineHeight: 165,
    spineStyle: 'fancy'
  },
  {
    id: 'seed-2',
    title: '1984',
    author: 'George Orwell',
    genre: 'Fantascienza',
    pages: 320,
    currentPage: 135,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1532714506i/40961427.jpg',
    status: 'reading',
    startDate: '2026-05-02',
    spineColor: '#2b2d42',
    spineHeight: 142,
    spineStyle: 'minimalist'
  },
  {
    id: 'seed-3',
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Fantascienza',
    pages: 650,
    currentPage: 0,
    coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg',
    status: 'planning',
    spineColor: '#b18a28',
    spineHeight: 170,
    spineStyle: 'classic'
  },
  {
    id: 'seed-4',
    title: 'Il Piccolo Principe',
    author: 'Antoine de Saint-Exupéry',
    genre: 'Romanzo',
    pages: 120,
    currentPage: 120,
    coverUrl: '',
    status: 'completed',
    startDate: '2026-05-18',
    endDate: '2026-05-20',
    rating: 9,
    review: 'Una favola filosofica immortale. Parla al cuore di bambini e adulti con una purezza e sensibilità strabiliante. Insegna che l\'essenziale è invisibile agli occhi.',
    spineColor: '#0e5f76',
    spineHeight: 118,
    spineStyle: 'modern'
  }
];

const DEFAULT_RECOMMENDATIONS: BookRecommendation[] = [
  {
    title: "L'Ombra del Vento",
    author: "Carlos Ruiz Zafón",
    genre: "Giallo",
    description: "Un'avventura avvolgente ambientata nella Barcellona del dopoguerra, tra labirinti letterari e segreti celati nel Cimitero dei Libri Dimenticati. Perfetto per chi ama il mistero, la suspense storica e lo stile gotico raffinato.",
    matchPercentage: 98,
    reason: "Dato che hai adorato l'intreccio investigativo medievale di 'Il Nome della Rosa' e apprezzi le atmosfere misteriose, sarai affascinato dai segreti gotici di Zafón.",
    pages: 440
  },
  {
    title: "La Svastica sul Sole",
    author: "Philip K. Dick",
    genre: "Fantascienza",
    description: "Un'ucronia disturbante in cui le potenze dell'Asse hanno vinto la Seconda Guerra Mondiale spartendosi gli Stati Uniti. Un capolavoro di paranoie sociologiche e universi alternativi.",
    matchPercentage: 94,
    reason: "Basandoci sul tuo vivo interesse per le letture distopiche di '1984', questo romanzo offre una riflessione profonda sui regimi autoritari ed universi paralleli.",
    pages: 310
  },
  {
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    genre: "Fantascienza",
    description: "Un futuro terrificante in cui i libri sono rigorosamente banditi e bruciati dai vigili del fuoco. Una lettera d'amore appassionata e viscerale verso il potere della letteratura e del libero pensiero umano.",
    matchPercentage: 91,
    reason: "Dato che segui romanzi dal forte sapore distopico, Fahrenheit 455 si allinea elegantemente ai tuoi gusti arricchendo la tua passione per il potere dei libri.",
    pages: 180
  }
];

export default function App() {
  // Main state trackers
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('bookflix_books');
    return saved ? JSON.parse(saved) : SEED_BOOKS;
  });

  const [recommendations, setRecommendations] = useState<BookRecommendation[]>(() => {
    const saved = localStorage.getItem('bookflix_recommendations');
    return saved ? JSON.parse(saved) : DEFAULT_RECOMMENDATIONS;
  });

  // Display Panel Tabs: 'shelf' | 'stats' | 'recommendations'
  const [activeTab, setActiveTab] = useState<'shelf' | 'stats' | 'recommendations'>('shelf');

  // Modals state structures
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [addModalInitialStatus, setAddModalInitialStatus] = useState<'planning' | 'reading' | 'completed'>('planning');
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannedBookData, setScannedBookData] = useState<any | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('bookflix_books', JSON.stringify(books));
  }, [books]);

  // Add customized book
  const handleAddBook = (newBookData: Omit<Book, 'id'>) => {
    const newBook: Book = {
      ...newBookData,
      id: `book-${Date.now()}`,
    };
    setBooks((prev) => [newBook, ...prev]);
    setIsAddBookModalOpen(false);
    setScannedBookData(null);
  };

  // Update existing book
  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
    setSelectedBook(null);
  };

  // Delete book from catalog
  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setSelectedBook(null);
  };

  // Web camera scanner success callback
  const handleScanSuccess = (bookData: any) => {
    setScannedBookData(bookData);
    setIsScannerModalOpen(false);
    // Directly open form to let them adjust the scanned details
    setAddModalInitialStatus('reading');
    setIsAddBookModalOpen(true);
  };

  // Submits library data to Gemini API backend to obtain recommended books
  const refreshRecommendations = async () => {
    try {
      const res = await fetch('/api/book/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ books }),
      });

      if (!res.ok) {
        throw new Error("Impossibile connettersi ai server AI.");
      }

      const data = await res.json();
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        localStorage.setItem('bookflix_recommendations', JSON.stringify(data.recommendations));
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore AI: Assicurati che la chiave GEMINI_API_KEY nei Secrets sia valida ed attiva per calcolare i consigli.");
    }
  };

  // Quick action: Adds a recommended book directly to their Planning shelf
  const handleAddFromRecommendation = (rec: BookRecommendation) => {
    const randomColor = ['#5c2020', '#1b4332', '#0d3b66', '#b18a28', '#4a306d', '#2a2a2e', '#7a3f1d'][Math.floor(Math.random() * 7)];
    const randomHeight = Math.floor(Math.random() * (172 - 132 + 1)) + 132;
    const randomStyle = (['classic', 'modern', 'fancy', 'minimalist'] as const)[Math.floor(Math.random() * 4)];

    const newBook: Book = {
      id: `book-${Date.now()}`,
      title: rec.title,
      author: rec.author,
      genre: rec.genre || "Generico",
      pages: rec.pages || 250,
      currentPage: 0,
      status: 'planning',
      coverUrl: (rec as any).coverUrl || '',
      description: rec.description,
      spineColor: randomColor,
      spineHeight: randomHeight,
      spineStyle: randomStyle,
    };

    setBooks((prev) => [newBook, ...prev]);
  };

  const addedTitles = books.map((b) => b.title);

  return (
    <div id="bookflix-root" className="min-h-screen bg-[#0A0A0B] text-slate-100 font-sans selection:bg-red-650 selection:text-white pb-24">
      
      {/* 1. CINEMATIC BACKGROUND GLOW */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-red-950/15 via-[#0A0A0B]/5 to-transparent pointer-events-none z-0"></div>

      {/* 2. HEADER BAR (Netflix-style brand) */}
      <header className="relative z-10 border-b border-white/10 bg-[#0F0F12] sticky top-0 px-4 py-0 h-20 flex items-center md:px-10">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand logo label */}
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold text-red-600 tracking-tighter uppercase font-sans animate-pulse">
              LIBROFLIX
            </span>
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/40 border border-red-500/10 text-[9px] font-bold text-red-400">
              <Sparkles className="w-3 h-3 animate-spin duration-[6s]" /> AI POWERED
            </div>
          </div>

          {/* Core Action triggers */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* Camera Scanner Trigger */}
            <button
              id="header-scanner-btn"
              onClick={() => setIsScannerModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-1.5 px-3 md:py-2 md:px-4 rounded-full text-xs font-bold uppercase tracking-wider text-red-500 hover:text-white flex items-center gap-2 transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden md:inline">Scansiona Libro</span>
            </button>

            {/* Quick manual Add Trigger */}
            <button
              id="header-add-btn"
              onClick={() => {
                setScannedBookData(null);
                setAddModalInitialStatus('planning');
                setIsAddBookModalOpen(true);
              }}
              className="bg-red-650 hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 py-1.5 px-3 md:py-2 md:px-5 rounded-full text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi</span>
            </button>
          </div>

        </div>
      </header>

      {/* 3. MAIN APP PANEL VIEW */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        
        {/* Welcome message banner and metadata panel info box */}
        <div className="bg-gradient-to-r from-red-950/20 to-zinc-900/40 border border-red-950/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tight font-serif text-amber-100">
              Il tuo scaffale letterario Netflix
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Fai fare un salto di qualità alla tua libreria domestica! Inquadra i libri con la fotocamera per catalogarli con l'AI o aggiungili cercando online. Recensisci le letture e ricevi raccomandazioni letterarie intelligenti basate sui tuoi voti.
            </p>
          </div>

          {/* Quick instructions indicator tooltip */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-950/50 border border-zinc-900 shrink-0 text-left text-xs text-zinc-400 font-medium max-w-xs">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="leading-normal">
              <b>Fotocamera spenta?</b> Trascina o sfoglia immagini o usa la barra di ricerca!
            </p>
          </div>
        </div>

        {/* Navigation Selector pills (Shelf, Recommendations, Statistics) */}
        <div id="view-tabs" className="flex border-b border-white/10 gap-1 overflow-x-auto pb-px select-none">
          <button
            onClick={() => setActiveTab('shelf')}
            className={`py-3 px-5 text-sm uppercase tracking-wider font-bold transition flex items-center gap-2.5 border-b-2 shrink-0 ${
              activeTab === 'shelf'
                ? 'border-red-600 text-white bg-gradient-to-t from-red-950/20 to-transparent'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Scaffali Libreria
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-3 px-5 text-sm uppercase tracking-wider font-bold transition flex items-center gap-2.5 border-b-2 shrink-0 ${
              activeTab === 'recommendations'
                ? 'border-red-600 text-white bg-gradient-to-t from-red-950/20 to-transparent'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Consigliati AI
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-5 text-sm uppercase tracking-wider font-bold transition flex items-center gap-2.5 border-b-2 shrink-0 ${
              activeTab === 'stats'
                ? 'border-red-600 text-white bg-gradient-to-t from-red-950/20 to-transparent'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analisi & Statistiche
          </button>
        </div>

        {/* Switch tab dynamic panel contents rendering */}
        <div id="main-panel-view" className="transition-all duration-300">
          
          {activeTab === 'shelf' && (
            <BookShelf
              books={books}
              onSelectBook={(book) => setSelectedBook(book)}
              onOpenAddModal={(initial) => {
                setScannedBookData(null);
                setAddModalInitialStatus(initial || 'planning');
                setIsAddBookModalOpen(true);
              }}
            />
          )}

          {activeTab === 'stats' && (
            <StatsDashboard books={books} />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsList
              books={books}
              recommendations={recommendations}
              onRefreshRecommendations={refreshRecommendations}
              onAddFromRecommendation={handleAddFromRecommendation}
              addedBookTitles={addedTitles}
            />
          )}

        </div>

      </main>

      {/* MODALS HOOKING WRAPPING LAYER */}

      {/* 4. CAMERA OPTICAL AI SCANNER MODAL */}
      {isScannerModalOpen && (
        <ScannerModal
          onClose={() => setIsScannerModalOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}

      {/* 5. ADD / CREATE BOOK DETAILS MODAL CARD */}
      {isAddBookModalOpen && (
        <AddBookModal
          initialStatus={addModalInitialStatus}
          initialBookData={scannedBookData}
          onClose={() => {
            setIsAddBookModalOpen(false);
            setScannedBookData(null);
          }}
          onAddBook={handleAddBook}
        />
      )}

      {/* 6. VIEW / EDIT EXTENDED BOOK SPECS DETAILS AND REVIEW MODAL */}
      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}

      {/* Bottom Status Bar (AI Suggestion Tip) to match Elegant Dark design */}
      <footer className="fixed bottom-0 left-0 right-0 h-12 bg-red-600/10 border-t border-red-600/20 flex items-center px-4 md:px-10 gap-3 z-40 backdrop-blur-sm">
        <div className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest text-white shrink-0">AI Suggest</div>
        <p className="text-xs text-slate-300 italic truncate">
          {books.length > 0 
            ? `"Visto che apprezzi '${books[Math.floor(books.length / 2) % books.length].title}', prova a calcolare nuovi consigli personalizzati nel tab Consigliati AI!"`
            : `"Aggiungi o scansiona dei libri per sbloccare la tua personale videoteca letteraria su Libroflix!"`
          }
        </p>
      </footer>

    </div>
  );
}
