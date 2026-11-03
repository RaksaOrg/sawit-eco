# Project Structure: Web vs Mobile Separation

Monorepo with strict separation. No symlinks and no shared web/mobile source folders.

```text
sawit-ecosystem/
├── apps/
│   ├── web/                          # WEB ONLY: Next.js 16 + SAP Fiori Horizon
│   │   ├── app/                      # App Router pages + API route handlers
│   │   ├── components/fiori/         # ShellBar, FioriPage, FioriStates
│   │   ├── lib/                      # Prisma client, auth, agent, KPI, WhatsApp
│   │   ├── src/                      # AI pipeline, PDP, RBAC, i18n, design tokens
│   │   ├── prisma/                   # Web database schema + seed
│   │   ├── .env*                     # Web environment variables (no symlinks)
│   │   ├── .eslintrc.js              # Web lint rules
│   │   ├── jest.config.js            # Web Jest + 100% coverage gate
│   │   ├── next.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json              # Web-only dependencies
│   └── mobile/                       # MOBILE ONLY: React Native + Expo + Paper
│       ├── App.tsx
│       ├── src/                      # App* components, screens, theme, offline outbox
│       ├── tsconfig.json
│       └── package.json              # Mobile-only dependencies
├── packages/
│   ├── contracts/                    # Shared Zod schemas & API types (no Prisma)
│   └── vision/                       # Independent Node tooling package
├── apps/web/postgres/                # Shared local DB init files
├── docker-compose.yml                # Root local infrastructure
├── .opencode/                        # Agent rules, shared laws, scripts
├── ARCHITECTURE.md
├── README.md
└── package.json                      # Orchestration scripts only (no web runtime deps)
```

## Ownership Rules

| Item                                                   | Owner                 | Location                                        |
| ------------------------------------------------------ | --------------------- | ----------------------------------------------- |
| Next.js pages, API, Fiori UI, Prisma, env              | Web                   | `apps/web/`                                     |
| Web runtime and build dependencies                     | Web                   | `apps/web/package.json`                         |
| Expo app, Paper components, SQLite outbox, SecureStore | Mobile                | `apps/mobile/`                                  |
| Mobile dependencies                                    | Mobile                | `apps/mobile/package.json`                      |
| Shared API contracts (Zod/types)                       | Shared                | `packages/contracts/`                           |
| Visual regression / vision CLI                         | Tooling               | `packages/vision/`                              |
| Database container and init SQL                        | Shared infrastructure | `apps/web/postgres/`, root `docker-compose.yml` |
| Root scripts, formatting config, docs                  | Workspace root        | root files                                      |

## Install and Run

```bash

# Root orchestration tooling

npm install

# Web

npm install --prefix apps/web
npm run dev

# Mobile

npm run mobile:install
npm run dev:mobile
npm run mobile:android
npm run mobile:ios
npm run mobile:typecheck
npm run mobile:test

# Shared contracts

npm run contracts:install
npm run contracts:typecheck
npm run contracts:test

# Vision tooling

npm install --prefix packages/vision
npm run vision:compare -- reference/a.png candidate.png diff.png
```

## Platform Matrix

| Platform   | Runtime                    | Design System                                                  | State / Storage                                        |
| ---------- | -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| **Web**    | Next.js 16 App Router      | SAP Fiori Horizon (`@ui5/webcomponents-react` + `sap_horizon`) | React Server Components + HMAC session cookie          |
| **Mobile** | React Native / Expo SDK 52 | Fiori-Inspired Native (`react-native-paper` + custom tokens)   | TanStack Query + Zustand + SQLite outbox + SecureStore |
