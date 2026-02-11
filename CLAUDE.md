# antigravity_claude Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-17

## Active Technologies
- Firebase Firestore（NoSQL document database） (001-phase0-foundation)
- TypeScript 5.x（Vite + React 18） (002-phase0-karuta-training)
- Firebase Firestore（NoSQL） (002-phase0-karuta-training)
- TypeScript 5.x (frontend), Node.js 18+ (Cloud Functions) (003-official-banzuke)
- Firebase Firestore (3 collections: poems, users, submissions) (003-official-banzuke)
- TypeScript 5.x（Frontend: Vite + React 18、Backend: Node.js 18+ for Cloud Functions） + React 18, React Router 6, Firebase SDK 10, Tailwind CSS 3 (004-stage0-12card-practice)
- Firebase Firestore（sessions, entries, rankings, userStats コレクション） (004-stage0-12card-practice)
- TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 18+ for Cloud Functions) + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions) (101-karuta-app-spec)
- Firebase Firestore (NoSQL document database) (101-karuta-app-spec)
- TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 18+ Cloud Functions) + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions) (102-utaawase-sekki-ranking)
- Firebase Firestore (6 new collections: rulesets, season_calendars, events, user_progress, season_snapshots, job_runs) (102-utaawase-sekki-ranking)
- Firebase Firestore (5 new collections: groups, group_memberships, group_invites, group_events, + matches拡張) (103-group-feature)
- TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions) + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions) (104-musubi-stage1)
- Firebase Firestore (NoSQL) — 既存コレクション: groups, group_memberships, group_invites, group_events, group_event_participants, group_stats (104-musubi-stage1)
- Firebase Firestore（新規コレクション: `invites`, 任意: `invite_participants`） (105-tebiki-invite)
- TypeScript 5.x（Frontend: Vite + React 18、Backend: Node.js 20 Cloud Functions） + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK, Stripe SDK v20.3.1 (107-billing-mvp)
- Firebase Firestore（サブコレクション: `users/{uid}/billing/*`, `users/{uid}/limits/*`, `stripe_events/*`） (107-billing-mvp)

- TypeScript 5.x + Node.js 18.x + React 18, Vite 5, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3 (001-phase0-foundation)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x + Node.js 18.x: Follow standard conventions

## Recent Changes
- 107-billing-mvp: Added TypeScript 5.x（Frontend: Vite + React 18、Backend: Node.js 20 Cloud Functions） + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK, Stripe SDK v20.3.1
- 105-tebiki-invite: Added TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions) + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
- 104-musubi-stage1: Added TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions) + React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
