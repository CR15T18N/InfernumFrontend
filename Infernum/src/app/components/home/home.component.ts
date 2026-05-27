import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CartService } from '../../services/cart.service';
import { User, Game } from '../../models/user.model';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [NavbarComponent, GlitchTextComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.sass'
})
export class HomeComponent implements OnInit, OnDestroy {
    currentUser: User | null = null;

    allGames: Game[] = [];
    featuredGames: Game[] = [];
    newGames: Game[] = [];
    topSellers: Game[] = [];
    specialOffers: Game[] = [];
    genres: string[] = [];

    isLoading = true;
    currentFeaturedIndex = 0;
    buyState: Record<number, 'idle' | 'buying' | 'owned' | 'error'> = {};

    offerEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    countdownDisplay = '';
    private countdownTimer: any;
    private carouselTimer: any;

    constructor(
        private authService: AuthService,
        private gameService: GameService,
        private cartService: CartService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.updateCountdown();
    }

    async ngOnInit() {
        this.authService.currentUser.subscribe(u => (this.currentUser = u));

        try {
            this.allGames = await this.gameService.getAllGames();
            this.buildSections();
            await this.loadOwnedGames();
        } catch (err) {
            console.error('Error loading home:', err);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }

        this.carouselTimer = setInterval(() => this.nextFeatured(), 5000);

        this.countdownTimer = setInterval(() => {
            this.updateCountdown();
            this.cdr.detectChanges();
        }, 1000);
    }

    ngOnDestroy() {
        clearInterval(this.carouselTimer);
        clearInterval(this.countdownTimer);
    }

    private buildSections() {
        this.featuredGames = this.allGames.slice(0, 3);

        this.newGames = [...this.allGames]
            .sort((a, b) => b.releaseYear - a.releaseYear)
            .slice(0, 20);

        this.topSellers = [...this.allGames]
            .filter(g => g.price > 0)
            .sort((a, b) => b.price - a.price)
            .slice(0, 20);

        this.specialOffers = [...this.allGames]
            .filter(g => g.price > 0 && g.discount && g.discount > 0)
            .slice(0, 20);

        this.genres = [...new Set(this.allGames.map(g => g.genre))];
        this.allGames.forEach(g => { if (g.id != null) this.buyState[g.id] = 'idle'; });
    }

    private async loadOwnedGames() {
        if (!this.currentUser?.id) return;
        const library = await this.gameService.getLibrary();
        library.forEach(g => { if (g.id != null) this.buyState[g.id] = 'owned'; });
    }

    prevFeatured() {
        this.currentFeaturedIndex =
            (this.currentFeaturedIndex - 1 + this.featuredGames.length) % this.featuredGames.length;
        clearInterval(this.carouselTimer);
        this.carouselTimer = setInterval(() => this.nextFeatured(), 5000);
    }

    nextFeatured() {
        this.currentFeaturedIndex = (this.currentFeaturedIndex + 1) % this.featuredGames.length;
    }

    goToFeatured(index: number) {
        this.currentFeaturedIndex = index;
        clearInterval(this.carouselTimer);
        this.carouselTimer = setInterval(() => this.nextFeatured(), 5000);
    }

    get currentFeatured(): Game | null {
        return this.featuredGames[this.currentFeaturedIndex] ?? null;
    }

    private updateCountdown() {
        const diff = this.offerEndsAt.getTime() - Date.now();
        if (diff <= 0) {
            this.countdownDisplay = '00:00:00';
            clearInterval(this.countdownTimer);
            return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        this.countdownDisplay = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    async buyGame(game: Game, event?: Event) {
        event?.stopPropagation();
        if (!this.currentUser?.id) {
            this.router.navigate(['/login']);
            return;
        }
        if (game.id == null) return;
        if (this.buyState[game.id] === 'owned' || this.buyState[game.id] === 'buying') return;

        this.buyState[game.id] = 'buying';
        this.cdr.detectChanges();

        try {
            const cartResult = await this.cartService.addToCart(game.id);
            if (!cartResult.success) {
                this.buyState[game.id] = 'error';
                this.cdr.detectChanges();
                return;
            }

            const checkoutResult = await this.cartService.checkout(cartResult.cartId!);
            if (checkoutResult.success && checkoutResult.url) {
                window.location.href = checkoutResult.url;
            } else {
                this.buyState[game.id] = 'error';
            }
        } catch {
            this.buyState[game.id] = 'error';
        }
        this.cdr.detectChanges();
    }

    getBuyLabel(game: Game): string {
        if (!game.id) return 'Buy';
        switch (this.buyState[game.id]) {
            case 'buying': return 'Processing…';
            case 'owned': return '✓ In library';
            case 'error': return 'Error — Retry';
            default: return 'Buy';
        }
    }

    isOwned(game: Game) {
        return game.id != null && this.buyState[game.id] === 'owned';
    }

    formatPrice(price: number) {
        return price === 0 ? 'Free' : `${price.toFixed(2)} €`;
    }

    hasDiscount(game: Game) {
        return !!game.discount && game.discount > 0 && game.price > 0;
    }

    discountedPrice(game: Game) {
        if (!game.discount) return this.formatPrice(game.price);
        return (game.price * (1 - game.discount / 100)).toFixed(2) + ' €';
    }

    navigateToGame(id: number | undefined) {
        if (id != null) this.router.navigate(['/game', id]);
    }

    navigateToStore(genre?: string) {
        this.router.navigate(['/store'], { queryParams: genre ? { genre } : {} });
    }

    onLogout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
