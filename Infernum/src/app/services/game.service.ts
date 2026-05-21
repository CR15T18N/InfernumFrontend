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
        return {
            id: bg.id,
            title: bg.name,
            description: bg.long_description || bg.short_description,
            price: bg.price,
            discount: bg.discount?.percentage || 0,
            coverUrl: bg.images && bg.images.length > 0 ? bg.images[0].url : 'https://placehold.co/200x280?text=No+Cover',
            genre: bg.genres && bg.genres.length > 0 ? bg.genres[0].type : 'Unknown',
            developer: 'Unknown', // Backend doesn't seem to have developer field in resource
            releaseYear: 2024,   // Backend doesn't seems to have releaseYear in resource
            finalPrice: (bg as any).final_prince || bg.final_price // Account for the 'final_prince' typo in backend
        };
    }

    async getAllGames(): Promise<Game[]> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame[] }>(`${this.apiUrl}/games/all/100`)
            );
            if (response.status === 'Succesfull') {
                return response.game.map(g => this.mapGame(g));
            }
            return [];
        } catch (error) {
            console.error('Error fetching games:', error);
            return [];
        }
    }

    async getGamesPage(page: number = 1, limit: number = 10): Promise<GamePage | null> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame[], pagination: PaginationInfo }>(
                    `${this.apiUrl}/games/all/${limit}?page=${page}`
                )
            );
            if (response.status === 'Succesfull') {
                return {
                    games: response.game.map(g => this.mapGame(g)),
                    pagination: response.pagination
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching games page:', error);
            return null;
        }
    }

    async getFilteredGamesPage(genre?: string, term?: string, page: number = 1): Promise<GamePage | null> {
        try {
            let url = `${this.apiUrl}/games/all/8?page=${page}`; // Default

            if (genre) {
                // Backend uses /filter?genre=... and returns 'games' instead of 'game'
                url = `${this.apiUrl}/games/filter?genre=${genre}&page=${page}`;
            } else if (term) {
                // Backend uses /name?term=... and returns 'game'
                url = `${this.apiUrl}/games/name?term=${term}&page=${page}`;
            }

            const response = await firstValueFrom(
                this.http.get<{ status: string, game?: BackendGame[], games?: BackendGame[], pagination: PaginationInfo }>(url)
            );

            // Handle backend inconsistencies (some return 'game', some 'games')
            const backendGames = response.game || response.games || [];

            if (response.status.startsWith('Succes')) {
                return {
                    games: backendGames.map(g => this.mapGame(g)),
                    pagination: response.pagination
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching filtered games page:', error);
            return null;
        }
    }

    async getGameById(id: number): Promise<Game | null> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ status: string, game: BackendGame }>(`${this.apiUrl}/games/details/${id}`)
            );
            if (response.status === 'Succesfull') {
                return this.mapGame(response.game);
            }
            return null;
        } catch (error) {
            console.error('Error fetching game details:', error);
            return null;
        }
    }

    async getLibrary(userId: number): Promise<Game[]> {
        // Backend doesn't support libraries yet (TODO in User.php)
        // We use localStorage for now to provide the functionality
        const raw = localStorage.getItem(`infernum_library_${userId}`);
        if (!raw) return [];
        try {
            const gameIds: number[] = JSON.parse(raw);
            const games: Game[] = [];
            for (const id of gameIds) {
                const g = await this.getGameById(id);
                if (g) games.push(g);
            }
            return games;
        } catch {
            return [];
        }
    }

    async purchaseGame(userId: number, gameId: number): Promise<boolean> {
        // Local persistence until backend supports it
        try {
            const raw = localStorage.getItem(`infernum_library_${userId}`);
            let gameIds: number[] = raw ? JSON.parse(raw) : [];
            if (!gameIds.includes(gameId)) {
                gameIds.push(gameId);
                localStorage.setItem(`infernum_library_${userId}`, JSON.stringify(gameIds));
            }
            return true;
        } catch (error) {
            console.error('Error purchasing game:', error);
            return false;
        }
    }

    async hasPurchased(userId: number, gameId: number): Promise<boolean> {
        const raw = localStorage.getItem(`infernum_library_${userId}`);
        if (!raw) return false;
        try {
            const gameIds: number[] = JSON.parse(raw);
            return gameIds.includes(gameId);
        } catch {
            return false;
        }
    }
}
