import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { Game, PaginationInfo } from '../../models/user.model';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';

@Component({
    selector: 'app-store',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, NavbarComponent, GlitchTextComponent],
    templateUrl: './store.component.html',
    styleUrl: './store.component.sass',
})
export class StoreComponent implements OnInit {
    allGames: Game[] = [];
    filteredGames: Game[] = [];
    searchQuery = '';
    selectedGenre = '';
    isLoading = true;

    genres: string[] = [];
    pagination: PaginationInfo | null = null;
    currentPage = 1;
    pageSize = 8; // Showing 8 games per page for a nice grid

    constructor(
        private gameService: GameService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        try {
            // Get all genres for the filter dropdown from the full list
            const all = await this.gameService.getAllGames();
            this.genres = [...new Set(all.map(g => g.genre))];

            await this.loadPage(1);

            this.route.queryParams.subscribe(params => {
                if (params['genre']) {
                    this.selectedGenre = params['genre'];
                }
                this.applyFilters();
                this.cdr.detectChanges();
            });
        } catch (error) {
            console.error('Error loading store:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async loadPage(page: number): Promise<void> {
        this.isLoading = true;
        this.currentPage = page;

        // Use the new filtered page method to ensure correct pagination metadata
        const result = await this.gameService.getFilteredGamesPage(this.selectedGenre, this.searchQuery, page);

        if (result) {
            this.allGames = result.games;
            this.filteredGames = result.games; // No need for local filtering anymore
            this.pagination = result.pagination;
        } else {
            this.allGames = [];
            this.filteredGames = [];
            this.pagination = null;
        }

        this.isLoading = false;
        this.cdr.detectChanges();
    }

    applyFilters(): void {
        // Reset to page 1 and reload from server with filters
        this.loadPage(1);
    }

    clearFilters(): void {
        this.searchQuery = '';
        this.selectedGenre = '';
        this.applyFilters();
    }

    formatPrice(price: number): string {
        return price === 0 ? 'Free' : `${price.toFixed(2)} €`;
    }

    finalPrice(game: Game): string {
        if (!game.discount || game.price === 0) return this.formatPrice(game.price);
        return ((game.price * (1 - game.discount / 100))).toFixed(2) + ' €';
    }

    hasDiscount(game: Game): boolean {
        return !!game.discount && game.discount > 0 && game.price > 0;
    }
}
