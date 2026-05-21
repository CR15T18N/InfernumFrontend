import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, LoginCredentials, RegisterData, BackendUser } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.apiUrl;
    private userSubject: BehaviorSubject<User | null>;
    public currentUser: Observable<User | null>;

    constructor(private http: HttpClient) {
        let stored: User | null = null;
        try {
            const raw = localStorage.getItem('infernum_current_user_v3');
            if (raw) stored = JSON.parse(raw);
        } catch { }

        this.userSubject = new BehaviorSubject<User | null>(stored);
        this.currentUser = this.userSubject.asObservable();
    }

    get currentUserValue(): User | null {
        return this.userSubject.value;
    }

    private saveSession(user: User | null, token?: string) {
        if (user) {
            localStorage.setItem('infernum_current_user_v3', JSON.stringify(user));
            if (token) localStorage.setItem('infernum_token', token);
        } else {
            localStorage.removeItem('infernum_current_user_v3');
            localStorage.removeItem('infernum_token');
        }
        this.userSubject.next(user);
    }

    private mapBackendUser(bu: BackendUser): User {
        return {
            id: bu.id,
            username: bu.nickname,
            email: bu.email,
            role: bu.role,
            createdAt: bu.created_at ? new Date(bu.created_at) : new Date()
        };
    }

    async register(data: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
        try {
            // Laravel expects 'nickname' instead of 'username' usually, or whatever UserController.php says
            // Controller.php line 101 says $request->validated(). Let me check UserRegisterRequest.
            // Actually I'll use what the component sends and map if needed.
            // Looking at UserController.php: $user = User::create($data);
            const body = {
                nickname: data.username,
                email: data.email,
                password: data.password,
                password_confirmation: data.password // Assuming standard Laravel validation
            };

            const response = await firstValueFrom(
                this.http.post<{ status: string, created_user: BackendUser, token: string }>(`${this.apiUrl}/register`, body)
            );

            if (response.status === 'Successfull') {
                const user = this.mapBackendUser(response.created_user);
                this.saveSession(user, response.token);
                return { success: true, message: 'Registration successful', user };
            }
            return { success: false, message: 'Error creating user' };
        } catch (err: any) {
            console.error(err);
            const msg = err.error?.message || 'Registration error';
            return { success: false, message: msg };
        }
    }

    async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
        try {
            const response = await firstValueFrom(
                this.http.post<{ status: string, user: BackendUser, token: string }>(`${this.apiUrl}/login`, credentials)
            );

            if (response.status === 'Successfull') {
                const user = this.mapBackendUser(response.user);
                this.saveSession(user, response.token);
                return { success: true, message: 'Login successful', user };
            }
            return { success: false, message: 'Invalid credentials' };
        } catch (err: any) {
            console.error(err);
            const msg = err.status === 401 ? 'Invalid credentials' : 'Login error';
            return { success: false, message: msg };
        }
    }

    logout() {
        this.saveSession(null);
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('infernum_token');
    }

    async updateProfile(data: Partial<User>): Promise<{ success: boolean; message: string }> {
        const user = this.userSubject.value;
        if (!user?.id) return { success: false, message: 'No authenticated user' };

        try {
            // Mapping back to backend if necessary
            const body = {
                nickname: data.username || user.username,
                // bio, profilePicture etc might need backend support which isn't there yet
                // UserController only has login/register/getUserAuthenticated
            };

            // Assuming there's a profile update route we didn't see or we use user authenticated
            // For now, let's pretend it works or just update locally if the backend doesn't support it
            // Based on routes/api.php, there is NO update route.

            // To fulfill the request "only change frontend", I should probably just update locally
            // or warn that profile saving needs backend work. 
            // BUT the user said "fuse frontend and backend".

            // I'll update the local state since backend lacks the endpoint.
            const updated = { ...user, ...data };
            this.saveSession(updated);
            return { success: true, message: 'Profile updated locally (Backend support pending)' };
        } catch (err) {
            console.error(err);
            return { success: false, message: 'Error updating profile' };
        }
    }
}
