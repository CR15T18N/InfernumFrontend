import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { Game } from '../../models/user.model';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button.component';

@Component({
    selector: 'app-game-detail',
    standalone: true,
    imports: [CommonModule, NavbarComponent, GlitchTextComponent, CyberButtonComponent],
    templateUrl: './game-detail.component.html',
    styleUrl: './game-detail.component.sass',
})
export class GameDetailComponent implements OnInit {
    game: Game | null = null;
    isOwned = false;
    isPurchasing = false;
    purchaseMessage = '';
    purchaseMessageType: 'success' | 'error' = 'success';
    isLoading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private gameService: GameService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit() {
        const raw = this.route.snapshot.paramMap.get('id');
        const id = Number(raw);
        if (!raw || isNaN(id)) {
            this.router.navigate(['/store']);
            return;
        }

        try {
            this.game = await this.gameService.getGameById(id);

            if (!this.game) { this.router.navigate(['/store']); return; }

            const user = this.authService.currentUserValue;
            if (user?.id && this.game.id != null) {
                this.isOwned = await this.gameService.hasPurchased(user.id, this.game.id);
            }
        } catch (e) {
            console.error('Error loading game detail:', e);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async purchase() {
        const user = this.authService.currentUserValue;
        if (!user?.id) { this.router.navigate(['/login']); return; }
        if (!this.game?.id) return;

        this.isPurchasing = true;
        try {
            const ok = await this.gameService.purchaseGame(user.id, this.game.id);
            if (ok) {
                this.isOwned = true;
                this.purchaseMessage = 'Game added to your library!';
                this.purchaseMessageType = 'success';
            } else {
                this.purchaseMessage = 'Error processing the purchase.';
                this.purchaseMessageType = 'error';
            }
            setTimeout(() => (this.purchaseMessage = ''), 5000);
        } catch {
            this.purchaseMessage = 'Error processing the purchase.';
            this.purchaseMessageType = 'error';
            setTimeout(() => (this.purchaseMessage = ''), 5000);
        } finally {
            this.isPurchasing = false;
            this.cdr.detectChanges();
        }
    }

    goBack() { history.back(); }

    formatPrice(price: number) {
        return price === 0 ? 'Free' : `${price.toFixed(2)} €`;
    }

    finalPrice(game: Game) {
        if (!game.discount || game.price === 0) return this.formatPrice(game.price);
        return (game.price * (1 - game.discount / 100)).toFixed(2) + ' €';
    }

    hasDiscount(game: Game) {
        return !!game.discount && game.discount > 0 && game.price > 0;
    }
}
