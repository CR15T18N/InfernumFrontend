import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

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
    imports: [RouterLink, FormsModule, NavbarComponent, GlitchTextComponent],
    templateUrl: './store.component.html',
    styleUrl: './store.component.sass',
})
export class StoreComponent implements OnInit {
    allGames: Game[] = [];
    currentFilteredList: Game[] = [];
    filteredGames: Game[] = [];

    searchQuery = '';
    selectedGenre = '';
    isLoading = true;

    genres: string[] = [];
    pagination: PaginationInfo | null = null;
    currentPage = 1;
    pageSize = 8;

    constructor(
        private gameService: GameService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        try {
            this.isLoading = true;
            this.allGames = await this.gameService.getAllGames();

            const genreSet = new Set<string>();
            this.allGames.forEach(g => {
                if (g.allGenres) {
                    g.allGenres.forEach(genre => genreSet.add(genre));
                } else {
                    genreSet.add(g.genre);
                }
            });
            this.genres = [...genreSet].filter(g => g !== 'Unknown').sort();

            this.route.queryParams.subscribe(params => {
                if (params['genre']) {
                    this.selectedGenre = params['genre'];
                }
                this.applyFilters();
            });

        } catch (error) {
            console.error('Error loading store:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    applyFilters(): void {
        this.currentPage = 1;

        this.currentFilteredList = this.allGames.filter(game => {
            const matchesGenre = !this.selectedGenre ||
                (game.allGenres ? game.allGenres.includes(this.selectedGenre) : game.genre === this.selectedGenre);

            const matchesSearch = !this.searchQuery ||
                game.title.toLowerCase().includes(this.searchQuery.toLowerCase());

            return matchesGenre && matchesSearch;
        });

        this.updatePagination();
        this.loadCurrentPage();
    }

    private updatePagination(): void {
        const total = this.currentFilteredList.length;
        const lastPage = Math.ceil(total / this.pageSize) || 1;

        this.pagination = {
            current_page: this.currentPage,
            total: total,
            per_page: this.pageSize,
            last_page: lastPage,
            has_more_page: this.currentPage < lastPage,
            next_page: this.currentPage < lastPage ? 'next' : null,
            previous_page: this.currentPage > 1 ? 'prev' : null
        };
    }

    private loadCurrentPage(): void {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.filteredGames = this.currentFilteredList.slice(startIndex, endIndex);
        this.cdr.detectChanges();
    }

    async loadPage(page: number): Promise<void> {
        if (page < 1 || (this.pagination && page > this.pagination.last_page)) return;

        this.currentPage = page;
        this.updatePagination();
        this.loadCurrentPage();

        window.scrollTo({ top: 0, behavior: 'smooth' });
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
