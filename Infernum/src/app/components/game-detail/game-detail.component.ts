import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CartService } from '../../services/cart.service';
import { Game } from '../../models/user.model';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button.component';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [NavbarComponent, GlitchTextComponent, CyberButtonComponent],
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
  activeImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private cartService: CartService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);
    if (!raw || isNaN(id)) {
      this.router.navigate(['/store']);
      return;
    }

    try {
      this.game = await this.gameService.getGameById(id);

      console.log(this.game);

      if (!this.game) {
        this.router.navigate(['/store']);
        return;
      }

      const user = this.authService.currentUserValue;
      if (user?.id && this.game.id != null) {
        this.isOwned = await this.gameService.hasPurchased(this.game.id);
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
    if (!user?.id) {
      this.router.navigate(['/login']);
      return;
    }
    if (!this.game?.id) return;

    this.cartService.addToLocalCart(this.game);
    this.cdr.detectChanges();
  }

  getButtonLabel(): string {
    if (!this.game) return 'ADD TO CART';
    const inCart = this.cartService.cartItems().some((item) => item.id === this.game?.id);
    return inCart ? '✓ ADDED TO CART' : 'ADD TO CART';
  }

  goBack() {
    history.back();
  }

  setActiveImage(index: number) {
    this.activeImageIndex = index;
  }

  nextImage() {
    if (!this.game?.images?.length) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % this.game.images.length;
  }

  prevImage() {
    if (!this.game?.images?.length) return;
    this.activeImageIndex =
      (this.activeImageIndex - 1 + this.game.images.length) % this.game.images.length;
  }

  getActiveImageUrl(): string {
    if (this.game?.images && this.game.images.length > this.activeImageIndex) {
      return this.game.images[this.activeImageIndex].url;
    }
    return this.game?.coverUrl || 'https://placehold.co/800x450/131313/00ffff?text=?';
  }

  getThumbUrl(img: any): string {
    return img.url;
  }

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
