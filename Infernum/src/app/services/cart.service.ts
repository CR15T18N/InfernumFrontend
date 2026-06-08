import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = environment.apiUrl;

  cartItems = signal<any[]>(this.loadCartFromStorage());
  isCartOpen = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  private loadCartFromStorage(): any[] {
    try {
      const data = localStorage.getItem('infernum_cart');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveCartToStorage(items: any[]) {
    localStorage.setItem('infernum_cart', JSON.stringify(items));
    this.cartItems.set(items);
  }

  addToLocalCart(game: any) {
    const current = this.loadCartFromStorage();
    if (!current.some((item) => item.id === game.id)) {
      current.push(game);
      this.saveCartToStorage(current);
    }
    this.isCartOpen.set(true);
  }

  removeFromLocalCart(gameId: number) {
    const current = this.loadCartFromStorage();
    const filtered = current.filter((item) => item.id !== gameId);
    this.saveCartToStorage(filtered);
  }

  clearLocalCart() {
    this.saveCartToStorage([]);
  }

  getLocalCart(): any[] {
    return this.cartItems();
  }

  async getCart(): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ status: string; cart: any }>(`${this.apiUrl}/cart/show`),
      );
      return res.status === 'Succesfull' ? res.cart : null;
    } catch {
      return null;
    }
  }

  async addToCart(gameId: number): Promise<{ success: boolean; message: string; cartId?: number }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ status: string; message: string; cart_id: number }>(
          `${this.apiUrl}/cart/create`,
          {
            game_id: gameId,
            quantity: 1,
          },
        ),
      );
      return { success: res.status === 'Successfull', message: res.message, cartId: res.cart_id };
    } catch (err: any) {
      return { success: false, message: err.error?.message || 'Could not add to cart' };
    }
  }

  async checkout(cartId: number): Promise<{ success: boolean; url?: string; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ state: string; url: string }>(`${this.apiUrl}/buy`, {
          shoppingCartId: cartId,
        }),
      );
      if (res.state === 'Success') return { success: true, url: res.url, message: '' };
      return { success: false, message: 'Could not start checkout' };
    } catch (err: any) {
      return { success: false, message: err.error?.message || 'Checkout error' };
    }
  }

  async verifyPayment(checkoutId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ status: string; message: string }>(`${this.apiUrl}/payments/verify`, {
          checkout_id: checkoutId,
        }),
      );
      return { success: res.status === 'Success', message: res.message };
    } catch (err: any) {
      return { success: false, message: err.error?.message || 'Payment verification failed' };
    }
  }

  async cancelCart(): Promise<any> {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/cart/cancel`));
    } catch {}
  }
}
