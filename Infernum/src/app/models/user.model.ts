export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  createdAt?: Date;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  level?: number;
  badges?: string[];
  role?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface Game {
  id?: number;
  title: string;
  genre: string;
  coverUrl: string;
  price: number;
  discount?: number;   // percentage
  description: string;
  releaseYear: number;
  developer: string;
  finalPrice?: number;
}

export interface Purchase {
  id?: number;
  userId: number;
  gameId: number;
  purchasedAt: Date;
}

// Backend Response Interfaces
export interface BackendUser {
  id: number;
  email: string;
  nickname: string;
  role: string;
  created_at?: string;
}

export interface BackendGame {
  id: number;
  name: string;
  short_description: string;
  long_description?: string;
  price: number;
  final_price: number;
  genres?: { id: number, type: string }[];
  images?: { id: number, url: string, type: string }[];
  discount?: { percentage: number };
}

export interface PaginationInfo {
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
  has_more_page: boolean;
  next_page: string | null;
  previous_page: string | null;
}

export interface GamePage {
  games: Game[];
  pagination: PaginationInfo;
}
