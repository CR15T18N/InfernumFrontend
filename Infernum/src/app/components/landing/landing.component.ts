import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';

interface Game {
  id: number;
  title: string;
  price: number;
  discount?: number;
  genre: string;
  featured?: boolean;
  isNew?: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [GlitchTextComponent, NavbarComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.sass',
})
export class LandingComponent {
  games: Game[] = [
    {
      id: 1,
      title: 'Cyber Runner 2077',
      price: 59.99,
      discount: 20,
      genre: 'Action',
      featured: true,
    },
    { id: 2, title: 'Neon Warfare', price: 49.99, discount: 15, genre: 'FPS', featured: true },
    { id: 3, title: 'Digital Shadows', price: 39.99, genre: 'RPG', isNew: true },
    { id: 4, title: 'Grid Hacker', price: 29.99, discount: 30, genre: 'Strategy' },
    { id: 5, title: 'Quantum Break', price: 44.99, genre: 'Adventure', isNew: true },
    { id: 6, title: 'Synth City', price: 34.99, discount: 25, genre: 'Simulation' },
    { id: 7, title: 'Void Runner', price: 24.99, genre: 'Platformer', isNew: true },
    { id: 8, title: 'Neural Network', price: 54.99, discount: 10, genre: 'Puzzle' },
  ];

  genres: string[] = ['Action', 'RPG', 'FPS', 'Strategy', 'Adventure', 'Simulation'];

  constructor(public router: Router) {}

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  getFeaturedGames(): Game[] {
    return this.games.filter((game) => game.featured);
  }

  getNewReleases(): Game[] {
    return this.games.filter((game) => game.isNew);
  }

  getSpecialOffers(): Game[] {
    return this.games.filter((game) => game.discount && game.discount > 0);
  }

  getDiscountedPrice(game: Game): number {
    if (game.discount) {
      return game.price * (1 - game.discount / 100);
    }
    return game.price;
  }
}
