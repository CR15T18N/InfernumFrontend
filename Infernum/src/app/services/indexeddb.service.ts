import { Injectable, NgZone } from '@angular/core';
import { User, Game, Purchase } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class IndexedDBService {
    private dbName = 'InfernumDB4';
    private dbVersion = 2;
    private dbReady: Promise<IDBDatabase>;

    constructor(private zone: NgZone) {
        // clean up any old DB names so stale schema doesn't persist
        ['InfernumDB', 'InfernumDB2', 'InfernumDB3'].forEach(n => indexedDB.deleteDatabase(n));
        this.dbReady = this.openDB();
    }

    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.dbVersion);

            req.onerror = () => this.zone.run(() => reject(req.error));
            req.onsuccess = () => this.zone.run(() => resolve(req.result));

            (req as any).onblocked = () => {
                console.warn('IndexedDB upgrade blocked — close other tabs and reload');
            };

            req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('users')) {
                    const s = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('email', 'email', { unique: true });
                    s.createIndex('username', 'username', { unique: false });
                }

                if (!db.objectStoreNames.contains('games')) {
                    db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('purchases')) {
                    const s = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                    s.createIndex('userId', 'userId', { unique: false });
                    s.createIndex('gameId', 'gameId', { unique: false });
                }
            };
        });
    }

    private run<T>(cb: (db: IDBDatabase) => IDBRequest<T>): Promise<T> {
        return this.dbReady.then(db => new Promise<T>((resolve, reject) => {
            const r = cb(db);
            r.onsuccess = () => this.zone.run(() => resolve(r.result as T));
            r.onerror = () => this.zone.run(() => reject(r.error));
        }));
    }

    async addUser(user: Omit<User, 'id'>): Promise<number> {
        return this.run(db => db.transaction('users', 'readwrite').objectStore('users').add(user) as IDBRequest<number>);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const r = await this.run<User | undefined>(db =>
            db.transaction('users', 'readonly').objectStore('users').index('email').get(email) as IDBRequest<User | undefined>
        );
        return r || null;
    }

    async getUserById(id: number): Promise<User | null> {
        const r = await this.run<User | undefined>(db =>
            db.transaction('users', 'readonly').objectStore('users').get(id) as IDBRequest<User | undefined>
        );
        return r || null;
    }

    async getAllUsers(): Promise<User[]> {
        return this.run(db => db.transaction('users', 'readonly').objectStore('users').getAll() as IDBRequest<User[]>);
    }

    async updateUser(user: User): Promise<void> {
        await this.run(db => db.transaction('users', 'readwrite').objectStore('users').put(user));
    }

    async deleteUser(id: number): Promise<void> {
        await this.run(db => db.transaction('users', 'readwrite').objectStore('users').delete(id));
    }

    async updateUserProfile(userId: number, data: Partial<User>): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;
            await this.updateUser({ ...user, ...data });
            return true;
        } catch (e) {
            console.error('updateUserProfile failed', e);
            return false;
        }
    }

    async addGame(game: Omit<Game, 'id'>): Promise<number> {
        return this.run(db => db.transaction('games', 'readwrite').objectStore('games').add(game) as IDBRequest<number>);
    }

    async getGameById(id: number): Promise<Game | null> {
        const r = await this.run<Game | undefined>(db =>
            db.transaction('games', 'readonly').objectStore('games').get(id) as IDBRequest<Game | undefined>
        );
        return r || null;
    }

    async getAllGames(): Promise<Game[]> {
        return this.run(db => db.transaction('games', 'readonly').objectStore('games').getAll() as IDBRequest<Game[]>);
    }

    async addPurchase(p: Omit<Purchase, 'id'>): Promise<number> {
        return this.run(db => db.transaction('purchases', 'readwrite').objectStore('purchases').add(p) as IDBRequest<number>);
    }

    async getPurchasesByUserId(userId: number): Promise<Purchase[]> {
        return this.run(db =>
            db.transaction('purchases', 'readonly').objectStore('purchases').index('userId').getAll(userId) as IDBRequest<Purchase[]>
        );
    }

    async hasPurchased(userId: number, gameId: number): Promise<boolean> {
        const list = await this.getPurchasesByUserId(userId);
        return list.some(p => p.gameId === gameId);
    }

    async seedGames(): Promise<void> {
        const existing = await this.getAllGames();
        if (existing.length > 0) return;

        const catalog: Omit<Game, 'id'>[] = [
            {
                title: 'Cyberpunk 2077',
                genre: 'RPG / Action',
                coverUrl: 'https://placehold.co/200x280/00ffff/131313?text=CP2077',
                price: 29.99,
                discount: 30,
                description: 'Open-world cyberpunk RPG set in Night City.',
                releaseYear: 2020,
                developer: 'CD Projekt Red'
            },
            {
                title: 'Dark Souls III',
                genre: 'Souls-like / RPG',
                coverUrl: 'https://placehold.co/200x280/ff003c/131313?text=DS3',
                price: 19.99,
                discount: 20,
                description: 'The challenging action RPG by FromSoftware.',
                releaseYear: 2016,
                developer: 'FromSoftware'
            },
            {
                title: 'Dota 2',
                genre: 'MOBA',
                coverUrl: 'https://placehold.co/200x280/00ffff/131313?text=Dota+2',
                price: 0,
                description: "Valve's free-to-play MOBA.",
                releaseYear: 2013,
                developer: 'Valve'
            },
            {
                title: 'Elden Ring',
                genre: 'Souls-like / Open World',
                coverUrl: 'https://placehold.co/200x280/ff003c/131313?text=Elden+Ring',
                price: 49.99,
                description: 'FromSoftware open-world RPG, co-created with George R.R. Martin.',
                releaseYear: 2022,
                developer: 'FromSoftware'
            },
            {
                title: 'Hollow Knight',
                genre: 'Metroidvania',
                coverUrl: 'https://placehold.co/200x280/00ffff/131313?text=HK',
                price: 9.99,
                description: 'Insect adventure in the fallen kingdom of Hallownest.',
                releaseYear: 2017,
                developer: 'Team Cherry'
            },
            {
                title: 'Hades',
                genre: 'Roguelike / Action',
                coverUrl: 'https://placehold.co/200x280/ff003c/131313?text=Hades',
                price: 24.99,
                discount: 15,
                description: 'Escape the Greek underworld in this roguelike.',
                releaseYear: 2020,
                developer: 'Supergiant Games'
            }
        ];

        for (const g of catalog) await this.addGame(g);
    }

    async seedPurchasesForUser(userId: number): Promise<void> {
        const existing = await this.getPurchasesByUserId(userId);
        if (existing.length > 0) return;

        const games = await this.getAllGames();
        for (const g of games.slice(0, 3)) {
            if (g.id != null) await this.addPurchase({ userId, gameId: g.id, purchasedAt: new Date() });
        }
    }
}
