import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Game, BackendGame, GamePage, PaginationInfo } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private mapGame(bg: BackendGame): Game {
        const allGenres = bg.genres ? bg.genres.map(g => g.type || 'Unknown') : [];
        return {
            id: bg.id,
            title: bg.name,
            description: bg.short_description,
            longDescription: bg.long_description,
            price: bg.price,
            discount: bg.discount?.percentage || 0,
            coverUrl: bg.images && bg.images.length > 0 ? bg.images[0].url : 'https://placehold.co/200x280?text=No+Cover',
            images: bg.images || [],
            genre: allGenres[0] || 'Unknown',
            allGenres,
            developer: 'Unknown',
            releaseYear: 2024,
            finalPrice: (bg as any).final_prince || bg.final_price
        };
    }

    async getAllGames(): Promise<Game[]> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame[] }>(`${this.apiUrl}/games/all/100`)
            );
            return res.status === 'Succesfull' ? res.game.map(g => this.mapGame(g)) : [];
        } catch (error) {
            console.error('Error fetching games:', error);
            return [];
        }
    }

    async getGamesPage(page: number = 1, limit: number = 10): Promise<GamePage | null> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame[], pagination: PaginationInfo }>(
                    `${this.apiUrl}/games/all/${limit}?page=${page}`
                )
            );
            if (res.status === 'Succesfull') {
                return { games: res.game.map(g => this.mapGame(g)), pagination: res.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching games page:', error);
            return null;
        }
    }

    async getFilteredGamesPage(genre?: string, term?: string, page: number = 1): Promise<GamePage | null> {
        try {
            let url = `${this.apiUrl}/games/all/8?page=${page}`;
            if (genre) url = `${this.apiUrl}/games/filter?genre=${genre}&page=${page}`;
            else if (term) url = `${this.apiUrl}/games/name?term=${term}&page=${page}`;

            const res = await firstValueFrom(
                this.http.get<{ status: string, game?: BackendGame[], games?: BackendGame[], pagination: PaginationInfo }>(url)
            );

            const games = res.game || res.games || [];
            if (res.status === 'Succesfull') {
                return { games: games.map(g => this.mapGame(g)), pagination: res.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching filtered games:', error);
            return null;
        }
    }

    async getGameById(id: number): Promise<Game | null> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame }>(`${this.apiUrl}/games/details/${id}`)
            );
            return res.status === 'Succesfull' ? this.mapGame(res.game) : null;
        } catch (error) {
            console.error('Error fetching game details:', error);
            return null;
        }
    }

    async getLibrary(): Promise<Game[]> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, games?: any[], message?: string }>(`${this.apiUrl}/library/games`)
            );
            if (res.status === 'Succesfull' && res.games) {
                return res.games.map(g => ({
                    id: g.id,
                    title: g.name,
                    description: g.short_description || '',
                    price: 0,
                    coverUrl: g.image?.url || 'https://placehold.co/200x280?text=No+Cover',
                    genre: 'Unknown',
                    developer: 'Unknown',
                    releaseYear: 2024
                }));
            }
            return [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async hasPurchased(gameId: number): Promise<boolean> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, games?: any[] }>(`${this.apiUrl}/library/games`)
            );
            return res.status === 'Succesfull' && !!res.games?.some(g => g.id === gameId);
        } catch {
            return false;
        }
    }
}
