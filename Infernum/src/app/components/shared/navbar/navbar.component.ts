import { Component, OnInit, signal } from '@angular/core';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GlitchTextComponent } from '../glitch-text/glitch-text.component';
import { AuthService } from '../../../services/auth.service';

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

    constructor(
        private authService: AuthService,
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
}
