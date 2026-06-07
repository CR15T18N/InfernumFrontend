import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
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

    async register(data: RegisterData): Promise<{ success: boolean; message: string; user?: User }> {
        try {
            const res = await firstValueFrom(
                this.http.post<{ status: string, created_user: BackendUser, token: string }>(`${this.apiUrl}/register`, {
                    nickname: data.username,
                    email: data.email,
                    password: data.password,
                    password_confirmation: data.password
                })
            );

            if (res.status === 'Successfull') {
                const u = res.created_user;
                const user: User = { 
                    id: u.id, 
                    username: u.nickname || data.username, 
                    email: u.email, 
                    role: u.role, 
                    createdAt: u.created_at ? new Date(u.created_at) : new Date() 
                };
                this.saveSession(user, res.token);
                return { success: true, message: '', user };
            }
            return { success: false, message: 'Error creating user' };
        } catch (err: any) {
            console.error(err);
            let msg = err.error?.message || 'Registration error';
            if (err.error?.errors) {
                const key = Object.keys(err.error.errors)[0];
                if (key && err.error.errors[key].length > 0) msg = err.error.errors[key][0];
            }
            return { success: false, message: msg };
        }
    }

    async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User; adminRedirectUrl?: string }> {
        try {
            const res = await firstValueFrom(
                this.http.post<{ status: string, user: BackendUser, token: string, admin_redirect_url?: string }>(`${this.apiUrl}/login`, credentials)
            );

            if (res.status === 'Successfull') {
                const u = res.user;
                
                // Save token first so the subsequent API call to fetch raw user details is authorized
                localStorage.setItem('infernum_token', res.token);

                let nickname = u.nickname;
                try {
                    const rawUserRes = await firstValueFrom(
                        this.http.get<{ status: string, user: any }>(`${this.apiUrl}/user`)
                    );
                    if (rawUserRes.status === 'Succesfull' && rawUserRes.user) {
                        nickname = rawUserRes.user.nickname;
                    }
                } catch (err) {
                    console.error('Error fetching raw user details in login:', err);
                }

                const user: User = { 
                    id: u.id, 
                    username: nickname || u.email.split('@')[0] || 'User', 
                    email: u.email, 
                    role: u.role, 
                    createdAt: u.created_at ? new Date(u.created_at) : new Date() 
                };
                this.saveSession(user, res.token);
                return { success: true, message: '', user, adminRedirectUrl: res.admin_redirect_url };
            }
            return { success: false, message: 'Invalid credentials' };
        } catch (err: any) {
            console.error(err);
            return { success: false, message: err.status === 401 ? 'Invalid credentials' : 'Login error' };
        }
    }

    logout() {
        this.saveSession(null);
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('infernum_token');
    }

    async fetchProfile(): Promise<void> {
        if (!this.isAuthenticated()) return;
        try {
            const res = await firstValueFrom(
                this.http.get<{ status: string, data: any }>(`${this.apiUrl}/profile/show`)
            );
            const user = this.userSubject.value;
            if ((res.status === 'Succesful' || res.status === 'Succesfull') && res.data && user) {
                let nickname = user.username;
                if (!nickname) {
                    try {
                        const rawUserRes = await firstValueFrom(
                            this.http.get<{ status: string, user: any }>(`${this.apiUrl}/user`)
                        );
                        if (rawUserRes.status === 'Succesfull' && rawUserRes.user) {
                            nickname = rawUserRes.user.nickname;
                        }
                    } catch (err) {
                        console.error('Error fetching raw user details in fetchProfile:', err);
                    }
                }

                let base = this.apiUrl.replace('/api/v1', '').replace('api/v1', '');
                if (base === '') {
                    base = '/';
                } else if (base.endsWith('/')) {
                    base = base.slice(0, -1);
                }
                const profile = res.data.profile;
                let pic = undefined;
                if (profile?.profile_picture) {
                    pic = profile.profile_picture.startsWith('http')
                        ? profile.profile_picture
                        : base === '/' ? `/${profile.profile_picture}` : `${base}/${profile.profile_picture}`;
                }
                this.saveSession({ 
                    ...user, 
                    username: nickname || user.email?.split('@')[0] || 'User',
                    displayName: profile?.display_name || user.displayName || nickname || 'User', 
                    bio: profile?.bio || '', 
                    profilePicture: pic 
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    async updateProfile(data: { displayName?: string; bio?: string; profilePicture?: File | string }): Promise<{ success: boolean; message: string }> {
        const user = this.userSubject.value;
        if (!user?.id) return { success: false, message: 'Not authenticated' };

        try {
            const form = new FormData();
            form.append('_method', 'PUT');
            if (data.displayName) form.append('display_name', data.displayName);
            if (data.bio) form.append('bio', data.bio);
            if (data.profilePicture instanceof File) form.append('profile_picture', data.profilePicture);

            const res = await firstValueFrom(
                this.http.post<{ status: string, profile: any }>(`${this.apiUrl}/profile/update`, form)
            );

            if (res.status === 'Succesful') {
                let base = this.apiUrl.replace('/api/v1', '').replace('api/v1', '');
                if (base === '') {
                    base = '/';
                } else if (base.endsWith('/')) {
                    base = base.slice(0, -1);
                }
                let pic = undefined;
                if (res.profile.profile_picture) {
                    pic = res.profile.profile_picture.startsWith('http')
                        ? res.profile.profile_picture
                        : base === '/' ? `/${res.profile.profile_picture}` : `${base}/${res.profile.profile_picture}`;
                }
                const token = localStorage.getItem('infernum_token') || undefined;
                this.saveSession({ ...user, displayName: res.profile.display_name, bio: res.profile.bio, profilePicture: pic }, token);
                return { success: true, message: 'Profile updated' };
            }
            return { success: false, message: 'Error updating profile' };
        } catch (err: any) {
            console.error(err);
            let msg = 'Error updating profile';
            if (err.error?.errors) {
                const key = Object.keys(err.error.errors)[0];
                if (key && err.error.errors[key].length > 0) msg = err.error.errors[key][0];
            }
            return { success: false, message: msg };
        }
    }
}
