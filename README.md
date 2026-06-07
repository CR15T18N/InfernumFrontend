# Infernum Frontend

An Angular-based single-page application (SPA) that serves as the frontend for the Infernum digital game store platform. It allows users to browse, search, purchase and manage their game library through a RESTful API backend built with Laravel.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
  - [Routing](#routing)
  - [Components](#components)
  - [Services](#services)
  - [Guards](#guards)
  - [Interceptors](#interceptors)
  - [Data Models](#data-models)
- [Environment Configuration](#environment-configuration)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Local Development (without Docker)](#local-development-without-docker)
  - [Local Development (with Docker)](#local-development-with-docker)
- [Production Build](#production-build)
  - [Docker Production Build](#docker-production-build)
- [Deployment](#deployment)
  - [CI/CD Pipeline](#cicd-pipeline)
  - [AWS CodeDeploy Hooks](#aws-codedeploy-hooks)
- [Infrastructure](#infrastructure)
  - [Apache Web Server](#apache-web-server)
  - [ModSecurity](#modsecurity)

---

## Overview

Infernum is a digital game store platform. This repository contains the Angular frontend application that communicates with a Laravel REST API. The application provides:

- A **Home** page with featured games, new releases, top sellers and special offers
- A **Store** page with genre filtering, search and pagination
- A **Game Detail** page with image gallery, system requirements and purchase flow
- **User authentication** (register, login, logout) with JWT token management
- A **Profile** page for viewing and editing user information
- A **Cart** system with local storage persistence and backend checkout via payment gateway
- An **Admin panel** redirect for users with administrator roles

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 |
| Language | TypeScript 5.9 |
| Styling | SASS |
| Icons | Font Awesome (angular-fontawesome) |
| HTTP Client | Angular HttpClient + RxJS 7.8 |
| Reactive state | Angular Signals |
| Testing | Karma + Jasmine |
| Web Server (prod) | Apache 2 + ModSecurity |
| Containerization | Docker (multi-stage build) |
| CI/CD | GitHub Actions + AWS CodeDeploy |

---

## Project Structure

```
InfernumFrontend/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
├── Infernum/                   # Angular application root
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── game-detail/    # Game detail page
│   │   │   │   ├── home/           # Home / landing dashboard
│   │   │   │   ├── landing/        # Public landing page
│   │   │   │   ├── login/          # Login form
│   │   │   │   ├── profile/        # User profile page
│   │   │   │   ├── register/       # Registration form
│   │   │   │   ├── shared/         # Reusable UI components
│   │   │   │   │   ├── cyber-button/
│   │   │   │   │   ├── glitch-text/
│   │   │   │   │   └── navbar/
│   │   │   │   └── store/          # Game catalog / store
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts
│   │   │   ├── models/
│   │   │   │   └── user.model.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── cart.service.ts
│   │   │   │   └── game.service.ts
│   │   │   ├── app.config.ts
│   │   │   ├── app.routes.ts
│   │   │   └── app.ts
│   │   ├── environments/
│   │   │   ├── environment.ts          # Development environment
│   │   │   └── environment.prod.ts     # Production environment
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.sass
│   ├── angular.json
│   ├── package.json
│   ├── proxy.conf.json             # Dev proxy to Laravel backend
│   └── tsconfig.json
├── scripts/
│   ├── before_install.sh           # CodeDeploy pre-install hook
│   └── after_install.sh            # CodeDeploy post-install hook
├── setup/
│   ├── utils/
│   │   ├── front.conf              # Apache VirtualHost config
│   │   ├── modsecurity.conf        # ModSecurity WAF config
│   │   └── mpm_prefork.conf        # Apache MPM tuning
│   ├── Dockerfile.base             # Shared base image layer
│   ├── Dockerfile.dev              # Development image
│   ├── Dockerfile.prod             # Multi-stage production image
│   ├── docker-compose.dev.yml      # Docker Compose for development
│   └── docker-compose.production.yml
└── appspec.yml                     # AWS CodeDeploy manifest
```

---

## Architecture

The application is built using Angular's **standalone component** architecture (no NgModules). Change detection uses the **zoneless** strategy (`provideZonelessChangeDetection`), meaning components rely on Angular Signals and explicit `ChangeDetectorRef.detectChanges()` calls rather than Zone.js.

### Routing

Defined in [`app.routes.ts`](Infernum/src/app/app.routes.ts):

| Path | Component | Guard |
|---|---|---|
| `/` | `HomeComponent` | None |
| `/home` | `HomeComponent` | None |
| `/login` | `LoginComponent` | None |
| `/register` | `RegisterComponent` | None |
| `/store` | `StoreComponent` | None |
| `/profile` | `ProfileComponent` | `authGuard` |
| `/game/:id` | `GameDetailComponent` | None |
| `**` | Redirect to `/` | None |

---

### Components

#### HomeComponent

**Path:** `src/app/components/home/`

The main dashboard displayed after login or when visiting the root URL. It fetches the entire game catalog and organizes it into four sections:

- **Featured games** - Auto-rotating carousel of the first 3 games (5-second interval)
- **New releases** - Games sorted descending by `releaseYear`, limited to 20
- **Top sellers** - Games sorted descending by price (paid games only), limited to 20
- **Special offers** - Games with an active discount, limited to 20

It also displays a **special offers countdown timer** that counts down 24 hours from page load.

Key behaviors:
- Unauthenticated users who attempt to purchase a game are redirected to `/login`
- Games already owned by the user are marked with a "In library" badge
- Clicking a game card navigates to `/game/:id`
- Genre tags navigate to `/store?genre=<genre>`

#### StoreComponent

**Path:** `src/app/components/store/`

Full game catalog with client-side filtering and pagination.

- Loads the complete game list once on initialization
- Supports simultaneous **genre filter** (from query param `?genre=`) and **text search** (by title)
- Pagination is handled entirely client-side with a page size of 8 games
- Genre list is built dynamically from all `allGenres` arrays across the catalog
- `clearFilters()` resets both search and genre selection

#### GameDetailComponent

**Path:** `src/app/components/game-detail/`

Detail view for a single game, loaded by numeric ID from the URL (`/game/:id`).

- Displays a **media gallery** with thumbnail navigation and keyboard-free prev/next controls
- Tabs for **About** (description) and **Requirements** (minimum/recommended system specs)
- Shows the final price taking discounts into account
- **Add to Cart** button adds the game to the local cart and reflects the state immediately
- If the user already owns the game, purchase is suppressed
- Invalid or missing game IDs redirect to `/store`

#### ProfileComponent

**Path:** `src/app/components/profile/`

Authenticated-only page for viewing and editing user information. Accessible only through `authGuard`.

#### LoginComponent / RegisterComponent

**Path:** `src/app/components/login/` and `src/app/components/register/`

Standard authentication forms. On successful login, admin users receive an `adminRedirectUrl` from the backend and are redirected to the admin panel.

#### Shared Components

| Component | Selector | Description |
|---|---|---|
| `NavbarComponent` | `app-navbar` | Top navigation bar with cart drawer and user menu |
| `GlitchTextComponent` | `app-glitch-text` | Decorative text with CSS glitch animation |
| `CyberButtonComponent` | `app-cyber-button` | Styled action button used in game detail view |

---

### Services

#### AuthService

**Path:** `src/app/services/auth.service.ts`

Handles all user authentication and session management.

**Local storage keys:**

| Key | Contents |
|---|---|
| `infernum_token` | Bearer JWT token |
| `infernum_current_user_v3` | Serialized `User` object |

**Methods:**

| Method | Returns | Description |
|---|---|---|
| `register(data)` | `Promise<{success, message, user?}>` | Registers a new user and saves the session |
| `login(credentials)` | `Promise<{success, message, user?, adminRedirectUrl?}>` | Authenticates a user, saves token and user |
| `logout()` | `void` | Clears session from local storage |
| `isAuthenticated()` | `boolean` | Returns `true` if a token exists in local storage |
| `fetchProfile()` | `Promise<void>` | Fetches the extended profile data and updates the session |
| `updateProfile(data)` | `Promise<{success, message}>` | Sends a multipart form update to the API |
| `currentUserValue` | `User \| null` | Synchronous snapshot of the current user |
| `currentUser` | `Observable<User \| null>` | Observable stream of the current user |

After login, the service makes a secondary `GET /user` call to retrieve the correct `nickname`, because the login response may return an incomplete user object.

#### GameService

**Path:** `src/app/services/game.service.ts`

Responsible for all game catalog API interactions. Internally maps `BackendGame` objects to the frontend `Game` model via a private `mapGame()` method.

**Methods:**

| Method | Returns | Description |
|---|---|---|
| `getAllGames()` | `Promise<Game[]>` | Fetches up to 100 games |
| `getGamesPage(page, limit)` | `Promise<GamePage \| null>` | Paginated game list |
| `getFilteredGamesPage(genre?, term?, page)` | `Promise<GamePage \| null>` | Filtered/searched paginated list |
| `getGameById(id)` | `Promise<Game \| null>` | Fetches a single game by its numeric ID |
| `getLibrary()` | `Promise<Game[]>` | Fetches the authenticated user's purchased games |
| `hasPurchased(gameId)` | `Promise<boolean>` | Checks if the user owns a specific game |

#### CartService

**Path:** `src/app/services/cart.service.ts`

Manages the shopping cart. Cart contents are persisted to local storage under the key `infernum_cart` and exposed as an Angular `signal`.

**Signals:**

| Signal | Type | Description |
|---|---|---|
| `cartItems` | `Signal<any[]>` | Current list of items in the cart |
| `isCartOpen` | `Signal<boolean>` | Controls the cart drawer visibility |

**Methods:**

| Method | Returns | Description |
|---|---|---|
| `addToLocalCart(game)` | `void` | Adds a game to the local cart (no duplicates) and opens the drawer |
| `removeFromLocalCart(gameId)` | `void` | Removes a specific game from the local cart |
| `clearLocalCart()` | `void` | Empties the local cart |
| `getLocalCart()` | `any[]` | Returns the current cart items |
| `getCart()` | `Promise<any>` | Fetches the server-side cart |
| `addToCart(gameId)` | `Promise<{success, message, cartId?}>` | Adds a game to the backend cart |
| `checkout(cartId)` | `Promise<{success, url?, message}>` | Initiates the payment checkout and returns the payment gateway URL |

---

### Guards

#### authGuard

**Path:** `src/app/guards/auth.guard.ts`

A functional route guard (`CanActivateFn`) that checks if the user has a valid token via `AuthService.isAuthenticated()`. If not authenticated, it redirects to `/login` and returns `false`.

Applied to: `/profile`

---

### Interceptors

#### authInterceptor

**Path:** `src/app/interceptors/auth.interceptor.ts`

A functional HTTP interceptor (`HttpInterceptorFn`) that:

1. Reads the JWT token from `localStorage`
2. Clones every outgoing request and attaches an `Authorization: Bearer <token>` header if the token is present
3. Catches `401 Unauthorized` responses, clears the session from local storage, and redirects the user to `/login`

Registered globally in [`app.config.ts`](Infernum/src/app/app.config.ts) via `provideHttpClient(withInterceptors([authInterceptor]))`.

---

### Data Models

All interfaces are defined in [`user.model.ts`](Infernum/src/app/models/user.model.ts).

#### User

```typescript
interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  createdAt?: Date;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  level?: number;
  badges?: string[];
  role?: string;
}
```

#### Game

```typescript
interface Game {
  id?: number;
  title: string;
  genre: string;
  allGenres?: string[];
  coverUrl: string;
  images?: { id: number; url: string; type: string }[];
  price: number;
  discount?: number;         // percentage
  description: string;
  longDescription?: string;
  releaseYear: number;
  developer: string;
  finalPrice?: number;
  requirements: Requirement[] | null;
}
```

#### Requirement

```typescript
interface Requirement {
  id: number;
  type: 'minimum' | 'recommended';
  os: string;
  cpu: string;
  ram: string;
  gpu: string;
  storage: string;
}
```

#### Backend response types

The `BackendGame` and `BackendUser` interfaces mirror the exact JSON structure returned by the Laravel API. The services are responsible for mapping them to the frontend models.

#### Pagination

```typescript
interface PaginationInfo {
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
  has_more_page: boolean;
  next_page: string | null;
  previous_page: string | null;
}
```

---

## Environment Configuration

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: '/api/v1',
};
```

API calls are proxied to the Laravel backend through `proxy.conf.json`. The proxy forwards the following paths to `http://Laravel:8000`:

| Prefix | Target |
|---|---|
| `/api` | Laravel API |
| `/administratorPanel` | Admin panel (Filament) |
| `/livewire` | Livewire websocket |
| `/filament` | Filament assets |
| `/storage` | Laravel file storage |

**Production** (`src/environments/environment.prod.ts`):
Uses the same relative `/api/v1` path. The Apache server handles reverse-proxying to the backend container.

---

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- Angular CLI >= 20 (`npm install -g @angular/cli`)
- Docker and Docker Compose (optional, for containerized development)

### Local Development (without Docker)

```bash
# 1. Navigate to the Angular application directory
cd Infernum

# 2. Install dependencies
npm install

# 3. Start the development server with proxy
ng serve --proxy-config proxy.conf.json

# The application will be available at http://localhost:4200
```

> The proxy expects the Laravel backend to be accessible at `http://Laravel:8000`. Add an entry to your `/etc/hosts` file if needed: `127.0.0.1 Laravel`

### Local Development (with Docker)

The development Docker setup mounts the `Infernum/` directory as a volume so changes are reflected live.

```bash
# From the setup/ directory
cd setup

# Start the Angular container (expects a shared Docker network named "shared_network")
docker compose -f docker-compose.dev.yml up -d
```

The container exposes port `4200`. The `shared_network` must exist and be shared with the backend and database containers.

### Running Tests

```bash
cd Infernum
ng test
```

---

## Production Build

### Docker Production Build

The production Dockerfile uses a **multi-stage build**:

1. **Stage `build`** (`angular-base`): Installs npm dependencies and compiles the Angular application with `ng build --configuration=production`. The output is placed in `dist/Infernum/browser/`.
2. **Stage `production`** (`ubuntu:22.04`): Installs Apache 2 with ModSecurity and ModSecurity CRS. Copies the compiled Angular assets into `/var/www/html/`. Copies the Apache, ModSecurity and MPM Prefork configurations. Starts Apache in the foreground.

**Enabled Apache modules:** `ssl`, `rewrite`, `headers`, `env`, `mpm_prefork`, `security2`, `proxy`, `proxy_http`

**Disabled Apache modules:** `autoindex`, `negotiation`, `mpm_event`

To build and start the production container manually:

```bash
# From the project root
docker build -f setup/Dockerfile.base --target base -t angular-base .
docker compose -f setup/docker-compose.production.yml up -d --build
```

The container exposes ports `80` (HTTP) and `443` (HTTPS). TLS certificates are mounted from the host path:
```
/etc/letsencrypt/live/frontend-infernum-original.duckdns.org/
```

---

## Deployment

### CI/CD Pipeline

**File:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

The pipeline is triggered automatically on every push to the `main` branch, or manually via `workflow_dispatch`.

**Steps:**

1. **Checkout** - Clones the repository
2. **Configure AWS Credentials** - Uses `aws-actions/configure-aws-credentials` with secrets stored in the `AWS Credentials` GitHub environment
3. **Zip source code** - Creates `code-deploy-app.zip` excluding `.git` and unneeded files
4. **Upload to S3** - Uploads the ZIP to the configured S3 bucket using the commit SHA as the key
5. **Create CodeDeploy deployment** - Triggers a deployment on the `frontend-app` application and `frontend-group` deployment group

**Required secrets / variables:**

| Name | Type | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Secret | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Secret | AWS IAM secret key |
| `AWS_SESSION_TOKEN` | Secret | AWS session token (for temporary credentials) |
| `BUCKET` | Variable | S3 bucket name for the deployment artifacts |

AWS region: `us-east-1`

### AWS CodeDeploy Hooks

Defined in [`appspec.yml`](appspec.yml). The source code is deployed to `/home/ubuntu/frontend-code` on the target EC2 instance.

| Hook | Script | Timeout |
|---|---|---|
| `BeforeInstall` | `scripts/before_install.sh` | 300 s |
| `AfterInstall` | `scripts/after_install.sh` | 300 s |

**`after_install.sh`** performs the following steps on the EC2 instance:
1. Builds the `angular-base` Docker image from `Dockerfile.base`
2. Starts the production container with `docker compose -f setup/docker-compose.production.yml up -d --build`
3. Waits 5 seconds and prints container logs and status
4. Sets the container restart policy to `always`
5. Restarts the Apache and Angular services

---

## Infrastructure

### Apache Web Server

Apache is configured through `setup/utils/front.conf` with the following responsibilities:
- Serve the compiled Angular SPA from `/var/www/html/`
- Redirect all unknown paths to `index.html` to support client-side routing
- Handle SSL/TLS termination
- Reverse-proxy API requests to the backend container

MPM Prefork tuning is defined in `setup/utils/mpm_prefork.conf`.

### ModSecurity

A Web Application Firewall (WAF) is enabled in production via `libapache2-mod-security2` with the OWASP Core Rule Set (CRS). The active configuration is stored in `setup/utils/modsecurity.conf` and is applied during the Docker build.
