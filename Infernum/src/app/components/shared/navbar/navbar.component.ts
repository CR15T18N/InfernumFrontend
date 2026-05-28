import { Component, OnInit, signal } from '@angular/core';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GlitchTextComponent } from '../glitch-text/glitch-text.component';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, GlitchTextComponent],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    isExpanded = signal(false);
    isLoggedIn = false;
    isCheckingOut = false;
    checkoutError = '';

    constructor(
        private authService: AuthService,
        public cartService: CartService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.authService.currentUser.subscribe(user => {
            this.isLoggedIn = !!user;
        });
    }

    toggleMenu() {
        this.isExpanded.update(v => !v);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/']);
    }

    toggleCart() {
        this.cartService.isCartOpen.update(v => !v);
    }

    removeFromCart(gameId: number) {
        this.cartService.removeFromLocalCart(gameId);
    }

    getCartTotal(): number {
        return this.cartService.cartItems().reduce((sum, item) => {
            const price = item.discount && item.discount > 0
                ? item.price * (1 - item.discount / 100)
                : item.price;
            return sum + price;
        }, 0);
    }

    async checkout() {
        if (!this.isLoggedIn) {
            this.cartService.isCartOpen.set(false);
            this.router.navigate(['/login']);
            return;
        }

        const items = this.cartService.getLocalCart();
        if (items.length === 0) return;

        this.isCheckingOut = true;
        this.checkoutError = '';

        try {
            let lastCartId: number | undefined;
            for (const item of items) {
                const res = await this.cartService.addToCart(item.id);
                if (res.success) {
                    lastCartId = res.cartId;
                } else if (res.message.includes('own')) {
                    this.removeFromCart(item.id);
                }
            }

            if (!lastCartId) {
                const backendCart = await this.cartService.getCart();
                if (backendCart && backendCart.id) {
                    lastCartId = backendCart.id;
                }
            }

            if (lastCartId) {
                const checkoutResult = await this.cartService.checkout(lastCartId);
                if (checkoutResult.success && checkoutResult.url) {
                    this.cartService.clearLocalCart();
                    this.cartService.isCartOpen.set(false);
                    window.location.href = checkoutResult.url;
                } else {
                    this.checkoutError = checkoutResult.message || 'Checkout failed. Please try again.';
                }
            } else {
                this.checkoutError = 'Your cart is empty or you already own all games in it.';
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.checkoutError = 'An error occurred during checkout.';
        } finally {
            this.isCheckingOut = false;
        }
    }
}
