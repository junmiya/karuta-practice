# Technical Research: Phase 0 - Official Banzuke System

**Feature**: Phase 0 - Official Banzuke System
**Branch**: `003-official-banzuke`
**Date**: 2026-01-17

## Overview

This document consolidates technical research and decisions for implementing the 百人一首 competitive karuta training platform. All decisions prioritize Phase 0 MVP requirements: server-side validation, cost efficiency (< ¥10,000/month), and tamper-proof official records.

---

## 1. Firebase Cloud Functions (Callable) Best Practices

### Decision: Use Callable Functions with TypeScript

**Chosen Approach**: Firebase Cloud Functions v2 (2nd gen) with Callable trigger type

**Rationale**:
- Callable functions provide built-in authentication context (`context.auth`)
- Automatic HTTPS endpoint generation (no manual API Gateway setup)
- CORS handling built-in for web clients
- Request/response type safety with TypeScript
- Client SDK has `httpsCallable()` helper for easy invocation

**Implementation Pattern**:

```typescript
// functions/src/submitOfficialRecord.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const submitOfficialRecord = onCall(async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { questionCount, correctCount, elapsedMs } = request.data;

  // Validation logic
  // Score calculation
  // Anomaly detection
  // Firestore write

  return { success: true, official: true, score: calculatedScore };
});
```

**Key Configurations**:
- Runtime: Node.js 18
- Region: `asia-northeast1` (Tokyo - closest to target users in Japan)
- Memory: 256MB (sufficient for lightweight validation logic)
- Timeout: 10s (submission should complete in < 2s)
- Concurrency: 80 (default for 2nd gen)

**Error Handling**:
- Use `HttpsError` for client-friendly errors
- Error codes: `invalid-argument`, `unauthenticated`, `permission-denied`, `internal`
- Client receives structured error: `{ code, message, details }`

**Cost Optimization**:
- Callable invoked only on official submission (not practice sessions)
- Estimated: < 1000 invocations/day = ¥0-100/month (well within budget)

**References**:
- [Firebase Callable Functions docs](https://firebase.google.com/docs/functions/callable)
- [Cloud Functions v2 migration guide](https://firebase.google.com/docs/functions/2nd-gen-upgrade)

---

## 2. Vite + React + TypeScript Project Structure

### Decision: Feature-based structure with services layer

**Chosen Structure**: `/src` with `pages/`, `components/`, `services/`, `hooks/`, `types/`, `utils/`

**Rationale**:
- **pages/**: Route-level components (HomePage, PracticePage, etc.) - clear 1:1 mapping to routes
- **components/**: Reusable UI components shared across pages
- **services/**: Business logic and Firebase interactions (thin React components)
- **hooks/**: Custom React hooks for stateful logic (useAuth, usePracticeSession)
- **types/**: Shared TypeScript interfaces (Poem, User, Submission)
- **utils/**: Pure utility functions (timer, random selection)

**Example Structure**:
```
src/
├── pages/PracticePage.tsx          # Renders practice UI
├── components/PracticeQuestion.tsx # Displays single question
├── services/practice.service.ts    # Practice session logic
├── hooks/usePracticeSession.ts     # State management for practice
├── types/practice.ts               # PracticeSession, Question types
└── utils/timer.ts                  # High-precision timing utilities
```

**Vite Configuration Highlights**:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src' // Absolute imports: import { useAuth } from '@/hooks/useAuth'
    }
  },
  build: {
    target: 'es2020', // Modern browsers only
    sourcemap: false, // Disable in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
});
```

**Build Optimization**:
- Code splitting: Vendor chunks for React and Firebase (better caching)
- Tree shaking: Tailwind CSS purges unused classes
- Asset optimization: Vite auto-compresses images and minifies JS/CSS

**Environment Variables**:
- Vite requires `VITE_` prefix for client-side env vars
- Example: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`
- Loaded from `.env` file (gitignored, template in `.env.example`)

**References**:
- [Vite project scaffolding](https://vitejs.dev/guide/#scaffolding-your-first-vite-project)
- [Vite env variables](https://vitejs.dev/guide/env-and-mode.html)

---

## 3. Tailwind CSS Integration with Vite

### Decision: Tailwind CSS v3 with JIT mode

**Setup**:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Configuration**:
```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}" // Purge unused classes
  ],
  theme: {
    extend: {
      colors: {
        // Custom karuta theme colors
        'karuta-red': '#c93d3d',
        'karuta-gold': '#d4af37'
      }
    }
  },
  plugins: []
};
```

**CSS Entry Point**:
```css
/* src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component classes */
@layer components {
  .btn-primary {
    @apply bg-karuta-red text-white font-bold py-2 px-4 rounded hover:bg-red-700;
  }
}
```

**Import in main.tsx**:
```typescript
import './styles/index.css';
```

**Build Performance**:
- JIT (Just-In-Time) mode enabled by default in v3
- Purges unused classes in production build
- Typical output: < 10KB gzipped CSS (compared to 300KB+ without purging)

**Design System** (Phase 0 minimal):
- Typography: Default Tailwind sans-serif font stack
- Spacing: Tailwind default scale (4px base)
- Responsive: Mobile-first breakpoints (sm:640px, md:768px, lg:1024px)
- Colors: Custom karuta-red for CTAs, karuta-gold for accents

**References**:
- [Tailwind + Vite guide](https://tailwindcss.com/docs/guides/vite)
- [Tailwind JIT mode](https://tailwindcss.com/docs/just-in-time-mode)

---

## 4. High-Precision Browser Timing APIs

### Decision: Use `performance.now()` for millisecond precision

**Chosen API**: `performance.now()`

**Rationale**:
- **Precision**: Sub-millisecond accuracy (typically microseconds)
- **Monotonic**: Not affected by system clock adjustments (unlike `Date.now()`)
- **Relative**: Returns DOMHighResTimeStamp relative to page load (ideal for elapsed time)
- **Browser Support**: Supported in all modern browsers (IE10+)

**Implementation**:
```typescript
// src/utils/timer.ts
export class PrecisionTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  getElapsedMs(): number {
    return Math.round(performance.now() - this.startTime);
  }

  reset(): void {
    this.startTime = 0;
  }
}
```

**Usage in Practice Session**:
```typescript
// Start timer when choices are displayed
const timer = new PrecisionTimer();
timer.start();

// User clicks choice
const elapsedMs = timer.getElapsedMs(); // e.g., 1247ms
```

**Accuracy Guarantees**:
- `performance.now()` returns floating-point DOMHighResTimeStamp
- Precision: 5 microseconds (0.005ms) in most browsers
- We round to integer milliseconds for storage (sufficient for karuta timing)

**Alternative Considered**: `Date.now()`
- Rejected: Only millisecond precision, subject to clock skew
- `Date.now()` can go backwards if system clock adjusted during session

**Client-Side vs Server-Side Timing**:
- **Client measures elapsed time** (user experience metric)
- **Server validates reasonableness** (anomaly detection: < 2000ms = too fast)
- Server does NOT re-measure timing (trusts client for UX, validates for security)

**References**:
- [MDN: performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [High Resolution Time spec](https://www.w3.org/TR/hr-time-2/)

---

## 5. Firestore Security Rules Patterns

### Decision: Function-only writes for submissions, user-owned data for users

**Chosen Patterns**:

**1. Public read for poems** (read-only seed data):
```javascript
match /poems/{poemId} {
  allow read: if true; // Anyone can read poems
  allow write: if false; // No one can write (seed script uses Admin SDK)
}
```

**2. User-owned data for users collection**:
```javascript
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create: if request.auth != null && request.auth.uid == uid
                && request.resource.data.keys().hasAll(['nickname', 'banzukeConsent', 'createdAt']);
  allow update: if request.auth != null && request.auth.uid == uid
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nickname', 'updatedAt']);
  allow delete: if false; // No deletion in Phase 0
}
```

**3. Function-only writes for submissions**:
```javascript
match /submissions/{submissionId} {
  allow read: if request.auth != null && resource.data.uid == request.auth.uid; // Users can read own submissions
  allow write: if false; // Only Cloud Functions can write (using Admin SDK)
}
```

**Security Principles**:
- **Least privilege**: Users can only access their own data
- **No client writes to submissions**: Prevents score/official flag tampering
- **Field-level validation**: `hasAll()` checks required fields, `hasOnly()` prevents unauthorized updates
- **Admin SDK bypasses rules**: Cloud Functions use Admin SDK to write submissions

**Testing Strategy**:
- Use Firebase Emulator to test rules before deployment
- Test matrix: authenticated vs unauthenticated, own data vs other users' data

**References**:
- [Firestore Security Rules guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules testing with Emulator](https://firebase.google.com/docs/rules/emulator-setup)

---

## 6. Firestore Query Optimization for Banzuke

### Decision: Composite index on (dayKeyJst, official, score, serverSubmittedAt)

**Banzuke Query**:
```typescript
const today = getCurrentJstDate(); // "2026-01-17"

const q = query(
  collection(db, 'submissions'),
  where('dayKeyJst', '==', today),
  where('official', '==', true),
  orderBy('score', 'desc'),
  orderBy('serverSubmittedAt', 'asc'),
  limit(100) // Phase 0 assumes < 100 submissions/day
);
```

**Required Composite Index**:
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "submissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dayKeyJst", "order": "ASCENDING" },
        { "fieldPath": "official", "order": "ASCENDING" },
        { "fieldPath": "score", "order": "DESCENDING" },
        { "fieldPath": "serverSubmittedAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Index Creation**:
- Auto-created on first query failure (Firestore provides index creation link)
- Or manually added to `firestore.indexes.json` and deployed with `firebase deploy --only firestore:indexes`

**Query Cost Estimation**:
- Read cost: 1 read per document + 1 read for query metadata
- Typical banzuke load: 50 submissions/day = 51 reads
- Daily cost: 51 reads × 30 days = 1530 reads/month (well within free tier of 50k reads/day)

**Optimization Notes**:
- `limit(100)`: Prevents expensive queries if submissions grow unexpectedly
- No pagination in Phase 0 (assumes < 100 daily submissions)
- Phase 1+ may add pagination with `startAfter()` for historical banzuke

**Alternative Considered**: Pre-aggregated daily rankings
- Rejected for Phase 0: Adds complexity (Scheduled Functions, aggregation logic)
- Query-based approach is simpler and sufficient for < 100 submissions/day

**References**:
- [Firestore query performance](https://firebase.google.com/docs/firestore/query-data/queries#performance_considerations)
- [Composite indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

---

## 7. JST Timezone Handling in Node.js

### Decision: Manual UTC+9 offset calculation (no external library)

**Chosen Approach**: Manual offset calculation using JavaScript Date

**Rationale**:
- **No dependencies**: Avoids adding `date-fns-tz` or `luxon` (reduces bundle size)
- **Simple logic**: JST = UTC+9 (no DST, fixed offset)
- **Sufficient for Phase 0**: Only need YYYY-MM-DD format for dayKeyJst

**Implementation**:
```typescript
// functions/src/lib/jstDate.ts
export function getCurrentJstDate(): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000; // UTC timestamp
  const jstTime = new Date(utcTime + 9 * 3600000); // UTC+9

  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`; // "2026-01-17"
}
```

**Why Not Intl.DateTimeFormat**:
```typescript
// Alternative considered (works but more verbose)
const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const parts = formatter.formatToParts(new Date());
// Extract year/month/day from parts array
```
- Rejected: More complex for simple YYYY-MM-DD format
- Intl API better for localized formatting (not needed here)

**Why Not date-fns-tz**:
- Rejected: Adds 10KB+ to Cloud Functions bundle
- Overkill for single use case (JST date string)

**Testing**:
- Test midnight boundary: 2026-01-17 23:59 JST → "2026-01-17"
- Test midnight rollover: 2026-01-18 00:00 JST → "2026-01-18"
- Test with UTC time: Ensure UTC input correctly converts to JST

**References**:
- [JavaScript Date UTC methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getUTCFullYear)
- [Timezone handling best practices](https://stackoverflow.com/questions/10087819/convert-date-to-another-timezone-in-javascript)

---

## 8. Firebase Admin SDK Setup in Cloud Functions

### Decision: Initialize Admin SDK with default credentials

**Initialization Pattern**:
```typescript
// functions/src/index.ts
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Admin SDK (automatically uses service account in Cloud Functions environment)
initializeApp();

// Export Firestore instance for use in functions
export const db = getFirestore();

// Export functions
export { submitOfficialRecord } from './submitOfficialRecord';
```

**Why Default Credentials**:
- Cloud Functions automatically provides service account credentials
- No need to manually load service account key file
- Credentials file only needed for local development (emulator)

**Local Development Setup**:
```bash
# Set environment variable for emulator
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
firebase emulators:start --only functions,firestore
```

**Firestore Operations**:
```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// Write submission (bypasses Security Rules)
await db.collection('submissions').add({
  uid: context.auth.uid,
  score: calculatedScore,
  serverSubmittedAt: FieldValue.serverTimestamp(),
  // ...
});
```

**Admin SDK vs Client SDK**:
| Feature | Admin SDK | Client SDK |
|---------|-----------|------------|
| Auth context | Manual (from `context.auth`) | Automatic (`currentUser`) |
| Security Rules | Bypassed (full access) | Enforced |
| Use case | Server-side (Cloud Functions) | Client-side (React app) |

**TypeScript Configuration**:
```json
// functions/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**References**:
- [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup)
- [Cloud Functions and Admin SDK](https://firebase.google.com/docs/functions/config-env)

---

## 9. React Router v6 Patterns for Protected Routes

### Decision: Custom `ProtectedRoute` component with auth guard

**Router Setup**:
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/banzuke" element={<BanzukePage />} />

        {/* Protected routes requiring authentication */}
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetupPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**ProtectedRoute Component**:
```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or spinner component
  }

  if (!user) {
    return <Navigate to="/" replace />; // Redirect to home if not authenticated
  }

  return <>{children}</>;
}
```

**useAuth Hook**:
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription
  }, []);

  return { user, loading };
}
```

**Profile Completeness Check**:
- Additional guard for routes requiring complete profile (nickname + banzukeConsent)
- Redirect to `/profile-setup` if user authenticated but profile incomplete

```typescript
// src/components/ProfileCompleteRoute.tsx
export function ProfileCompleteRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  if (loading || profileLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!profile?.nickname || !profile?.banzukeConsent) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
}
```

**References**:
- [React Router v6 authentication example](https://reactrouter.com/en/main/start/tutorial#authentication)
- [Firebase Auth with React](https://firebase.google.com/docs/auth/web/start)

---

## 10. TypeScript Shared Types Between Frontend and Cloud Functions

### Decision: Duplicate types in both projects (no monorepo for Phase 0)

**Rationale**:
- **Simplicity**: Avoid monorepo complexity (Nx, Turborepo, Lerna) for Phase 0
- **Small surface area**: Only 3-4 types need sharing (Submission, SubmitPayload, SubmitResponse)
- **Independence**: Frontend and functions can have slightly different type definitions (e.g., Firestore Timestamp vs Date)

**Approach**: Duplicate core types with comments linking to source of truth

**Frontend Types**:
```typescript
// apps/web/src/types/submission.ts
export interface Submission {
  uid: string;
  mode: 'choice8';
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
  avgMs: number;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string; // "YYYY-MM-DD"
  serverSubmittedAt: Date; // Firestore Timestamp converted to Date
}

export interface SubmitOfficialRecordPayload {
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
}

export interface SubmitOfficialRecordResponse {
  success: boolean;
  official: boolean;
  score: number;
  invalidReasons?: string[];
  submissionId: string;
}
```

**Cloud Functions Types** (duplicate with server-side perspective):
```typescript
// functions/src/types/submission.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Submission {
  uid: string;
  mode: 'choice8';
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
  avgMs: number;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string; // "YYYY-MM-DD"
  serverSubmittedAt: Timestamp; // Firestore FieldValue.serverTimestamp()
}

// Payload and response types (identical to frontend)
export interface SubmitOfficialRecordPayload {
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
}

export interface SubmitOfficialRecordResponse {
  success: boolean;
  official: boolean;
  score: number;
  invalidReasons?: string[];
  submissionId: string;
}
```

**Maintenance Strategy**:
- Mark types with `// SOURCE OF TRUTH: functions/src/types/submission.ts` comment
- Phase 1+ may migrate to monorepo with shared packages if type proliferation becomes issue

**Alternative Considered**: Monorepo with shared `packages/types`
- Rejected for Phase 0: Overhead of monorepo tooling (Nx, pnpm workspaces)
- Benefit: Single source of truth, guaranteed sync
- Cost: Build complexity, incremental compilation, deployment coordination

**References**:
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo best practices](https://monorepo.tools/)

---

## Summary of Technology Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Cloud Functions | v2 Callable with TypeScript | Built-in auth, CORS, type safety |
| Frontend Structure | Feature-based with services layer | Clear separation, testable business logic |
| CSS Framework | Tailwind CSS v3 JIT | Utility-first, minimal output, fast builds |
| Timing API | `performance.now()` | Sub-millisecond precision, monotonic |
| Security Rules | Function-only writes for submissions | Tamper-proof official records |
| Banzuke Query | Composite index on (dayKeyJst, official, score, serverSubmittedAt) | Efficient sorting, < 100 reads/query |
| JST Timezone | Manual UTC+9 offset | No dependencies, simple logic |
| Admin SDK | Default credentials initialization | Auto-configured in Cloud Functions |
| React Router | Protected routes with custom component | Authentication guards, profile checks |
| Shared Types | Duplicate in frontend and functions | Avoid monorepo complexity in Phase 0 |

**All decisions align with Constitution v6.0.0 requirements and Phase 0 MVP scope.**

---

**Next Phase**: Generate data-model.md, contracts/, and quickstart.md (Phase 1 artifacts)
