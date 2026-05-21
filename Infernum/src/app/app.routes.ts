import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { LandingComponent } from './components/landing/landing.component';
import { ProfileComponent } from './components/profile/profile';
import { GameDetailComponent } from './components/game-detail/game-detail.component';
import { StoreComponent } from './components/store/store.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'home', component: HomeComponent },
    { path: 'store', component: StoreComponent },
    { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
    { path: 'game/:id', component: GameDetailComponent },
    { path: '**', redirectTo: '/' }
];
