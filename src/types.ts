export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  currentPage: number;
  coverUrl?: string;
  ean?: string;
  description?: string;
  status: 'planning' | 'reading' | 'completed'; // Da leggere, In lettura, Terminato
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  rating?: number;    // 1 to 10
  review?: string;    // user thoughts
  spineColor: string; // aesthetic spine color for the shelf
  spineHeight: number; // custom spine height (e.g., 110 to 140px)
  spineStyle: 'classic' | 'modern' | 'fancy' | 'minimalist';
}

export interface RecommendationResponse {
  recommendations: BookRecommendation[];
}

export interface BookRecommendation {
  title: string;
  author: string;
  genre: string;
  description: string;
  matchPercentage: number;
  reason: string;
  pages?: number;
  coverUrl?: string;
  ean?: string;
}
