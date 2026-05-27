import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    async getCart(): Promise<any> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, cart: any }>(`${this.apiUrl}/cart/show`)
            );
            return res.status === 'Succesfull' ? res.cart : null;
        } catch {
            return null;
        }
    }

    async addToCart(gameId: number): Promise<{ success: boolean; message: string; cartId?: number }> {
        try {
            const res = await firstValueFrom(
                this.http.post<{ status: string, message: string, cart_id: number }>(`${this.apiUrl}/cart/create`, {
                    game_id: gameId,
                    quantity: 1
                })
            );
            return { success: res.status === 'Successfull', message: res.message, cartId: res.cart_id };
        } catch (err: any) {
            return { success: false, message: err.error?.message || 'Could not add to cart' };
        }
    }

    async checkout(cartId: number): Promise<{ success: boolean; url?: string; message: string }> {
        try {
            const res = await firstValueFrom(
                this.http.post<{ state: string, url: string }>(`${this.apiUrl}/buy`, { shoppingCartId: cartId })
            );
            if (res.state === 'Success') return { success: true, url: res.url, message: '' };
            return { success: false, message: 'Could not start checkout' };
        } catch (err: any) {
            return { success: false, message: err.error?.message || 'Checkout error' };
        }
    }
}
