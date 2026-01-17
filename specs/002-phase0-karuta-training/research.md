# Technical Research: Vite + React + TypeScript + Firebase SPA

**Date**: 2026-01-17
**Purpose**: Technical research and best practices for Vite + React + TypeScript + Firebase (Auth/Firestore) SPA project

## Research Topics

### 1. Firebase SDK Setup with Vite

**Decision**: Use Firebase Web SDK v10 (modular API) with Vite environment variables and tree-shaking optimization

**Rationale**:
- **Modular SDK Benefits**: Firebase v10's modular API enables tree-shaking, reducing bundle size by up to 80% compared to the namespaced API. This is critical for performance in production builds.
- **TypeScript Integration**: The modular SDK provides excellent TypeScript support with accurate type inference for Firestore operations, reducing runtime errors.
- **Vite Compatibility**: Firebase SDK v10+ has fixed compatibility issues with Vite, ensuring the correct output bundle is resolved.
- **Environment Variable Security**: Vite's `import.meta.env.*` prefix pattern keeps configuration separate from code while maintaining type safety.

**Best Practices**:

**Firebase Initialization Pattern**:
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Environment Variable Management**:
- Use `VITE_` prefix for all environment variables that need to be exposed to client code
- Store variables in `.env` for local development
- Add `.env.local` to `.gitignore` for sensitive local-only variables
- Create `.env.template` or `.env.example` to document required variables without exposing actual values
- Configure environment variables in hosting platform's dashboard (Netlify, Vercel, Firebase Hosting) for production deployments

**Environment File Structure**:
```bash
# .env.example (committed to repo)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# .env.local (gitignored, for actual secrets)
# Actual values go here
```

**Tree-Shaking Configuration**:

To maximize tree-shaking benefits with Firebase SDK v10:

1. **Use Modular Imports**: Import only specific functions needed
```typescript
// Good - tree-shakeable
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Bad - imports everything
import * as firestore from 'firebase/firestore';
```

2. **Vite Config Optimization**: Add esbuild configuration to remove license comments
```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    legalComments: 'none' // Reduces Firebase chunk by ~30% (88 KB)
  }
});
```

3. **Use Firestore Lite for Read-Only Operations**: If you don't need real-time listeners, use the lite SDK
```typescript
// For read-only operations - 38.21kb bundle
import { getFirestore } from 'firebase/firestore/lite';
```

**Alternatives Considered**:
- **Firebase Web SDK v9 (compat)**: Backward compatible but larger bundle size, now deprecated
- **Firebase Admin SDK**: Server-side only, cannot run in browser
- **Direct REST API**: Loses SDK type safety, error handling, and offline capabilities
- **Webpack Instead of Vite**: More complex configuration, slower build times

**References**:
- [Firebase with React and TypeScript Guide](https://dev.to/sahilverma_dev/firebase-with-react-and-typescript-a-comprehensive-guide-3fn5)
- [Firebase JavaScript SDK Release Notes](https://firebase.google.com/docs/web/setup)
- [Using module bundlers with Firebase](https://firebase.google.com/docs/web/module-bundling)
- [Firebase Modular SDK Bundle Size Comparison](https://miyauchi.dev/posts/firebase-bundle-size/)
- [Vite Environment Variables Documentation](https://vite.dev/guide/env-and-mode)
- [Firebase Environment Variables Security](https://bk10895.medium.com/how-to-securely-use-firebase-with-react-typescript-and-vite-1fa8833fcb2c)

---

### 2. Vite Optimization

**Decision**: Implement manual chunk splitting for vendor libraries and route-based code splitting with React.lazy()

**Rationale**:
- **Build Performance**: Vite 6.0 build optimization can reduce build times by up to 70% through strategic code splitting
- **Bundle Size Reduction**: Manual chunk splitting for vendor libraries reduces main bundle size by 40-60%
- **Route-Based Splitting**: Lazy loading routes improves initial load time by deferring non-critical code
- **Production Optimization**: Vite's rollup-based production build with tree-shaking automatically removes unused code

**Best Practices**:

**Manual Chunk Configuration**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['tailwindcss'] // if using component libraries
        }
      }
    }
  },
  esbuild: {
    legalComments: 'none' // Remove license comments (30% reduction)
  }
});
```

**React Router Code Splitting**:
```typescript
// App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load route components
const HomePage = lazy(() => import('./pages/HomePage'));
const BasicPage = lazy(() => import('./pages/BasicPage'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/basic" element={<BasicPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**React Router v7.2.0+ Split Route Modules** (if using framework features):
```typescript
// vite.config.ts with React Router plugin
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

export default defineConfig({
  plugins: [
    reactRouter({
      future: {
        unstable_splitRouteModules: true // Automatic route splitting
      }
    })
  ]
});
```

**Firebase SDK Import Optimization**:
```typescript
// Good - specific imports for tree-shaking
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Avoid - barrel imports that prevent tree-shaking
import * as firestore from 'firebase/firestore';
```

**Production Build Checklist**:
- Enable minification (default in Vite)
- Configure chunk size warnings: `build.chunkSizeWarningLimit`
- Use `build.target` to specify browser support (e.g., 'es2015' for modern browsers)
- Enable CSS code splitting with `build.cssCodeSplit: true`
- Configure compression (gzip/brotli) at hosting level

**Alternatives Considered**:
- **Webpack**: More complex configuration, slower build times compared to Vite's esbuild-based dev server
- **No Code Splitting**: Results in large initial bundle, slower page load
- **Dynamic Imports Without Lazy**: Doesn't work with React components, requires React.lazy wrapper

**References**:
- [Vite 6.0 Build Optimization Guide](https://markaicode.com/vite-6-build-optimization-guide/)
- [Code Splitting in React with Vite](https://medium.com/@akashsdas_dev/code-splitting-in-react-w-vite-eae8a9c39f6e)
- [React Router Automatic Code Splitting](https://reactrouter.com/explanation/code-splitting)
- [React Router Split Route Modules](https://remix.run/blog/split-route-modules)
- [Vite Code Splitting Guide](https://sambitsahoo.com/blog/vite-code-splitting-that-works.html)

---

### 3. Tailwind CSS Optimization

**Decision**: Use Tailwind CSS v3+ with automatic purging via content configuration in Vite projects

**Rationale**:
- **Automatic Tree-Shaking**: Tailwind v3+ uses JIT (Just-In-Time) mode by default, generating only the CSS classes used in your project
- **Bundle Size**: Proper purge configuration can reduce CSS from 250 KB to <10 KB (compressed)
- **Vite Integration**: Tailwind works seamlessly with Vite's PostCSS pipeline without additional plugins
- **Performance**: Production builds automatically purge unused styles, making it very difficult to exceed 10 KB of compressed CSS

**Best Practices**:

**Tailwind Configuration for Vite**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // All source files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**PostCSS Configuration**:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**CSS Entry Point**:
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Component-Level Best Practices**:

1. **Use Utility Classes**: Avoid creating custom CSS when Tailwind utilities exist
```tsx
// Good - using Tailwind utilities
<div className="p-4 bg-white rounded-lg shadow-md">

// Avoid - custom CSS for common patterns
<div style={{ padding: '1rem', background: 'white' }}>
```

2. **Responsive Design with Mobile-First**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

3. **Extract Repeated Patterns to Components** (not @apply):
```tsx
// Good - component composition
const Button = ({ children }) => (
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    {children}
  </button>
);

// Avoid - @apply in CSS (defeats JIT purpose)
```

4. **Conditional Classes with clsx/classnames**:
```tsx
import clsx from 'clsx';

<div className={clsx(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50 cursor-not-allowed'
)} />
```

**Advanced Optimization with vite-plugin-tailwind-purgecss**:

For projects using Tailwind UI or component libraries, use the enhanced purge plugin:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import tailwindPurgecss from 'vite-plugin-tailwind-purgecss';

export default defineConfig({
  plugins: [
    tailwindPurgecss() // Enhanced purging for component libraries
  ]
});
```

**Dynamic Class Names Warning**:

PurgeCSS is intentionally naive - it looks for string matches, not dynamic JavaScript. Avoid:
```tsx
// Bad - classes won't be detected by purge
const color = 'blue';
<div className={`bg-${color}-500`} /> // Class will be purged!

// Good - explicit class names
<div className={color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} />
```

**Production Optimization Checklist**:
- Configure `content` paths to include all template files
- Verify purge is working: check final CSS size < 10 KB (gzipped)
- Use PurgeCSS safelist for dynamically generated classes if needed
- Enable minification (automatic in production builds)

**Alternatives Considered**:
- **Manual PurgeCSS**: Tailwind v3+ includes this automatically via JIT mode
- **CSS Modules**: Requires separate CSS files per component, more verbose
- **Styled Components**: Runtime CSS-in-JS has performance overhead
- **Bootstrap**: Fixed design system, harder to customize, larger bundle

**References**:
- [Tailwind CSS Optimizing for Production](https://v2.tailwindcss.com/docs/optimizing-for-production)
- [Tailwind CSS Performance Optimization](https://www.tailwindtap.com/blog/how-to-optimize-tailwind-css-for-performance-and-speed)
- [vite-plugin-tailwind-purgecss](https://github.com/AdrianGonz97/vite-plugin-tailwind-purgecss)
- [How I Dropped 250 KB with PurgeCSS](https://frontstuff.io/how-i-dropped-250-kb-of-dead-css-weight-with-purgecss)

---

### 4. Client-side Timing Precision

**Decision**: Use `performance.now()` for high-precision timing measurements in browser applications

**Rationale**:
- **Higher Precision**: `performance.now()` provides microsecond precision (up to 5µs accuracy) vs `Date.now()` millisecond precision
- **Monotonic Clock**: `performance.now()` is not affected by system clock adjustments, clock skew, or NTP synchronization
- **Relative Timing**: Returns time elapsed since page load, making it ideal for measuring duration of operations
- **Cross-Browser Support**: Well-established API available across all modern browsers since September 2015

**Best Practices**:

**When to Use performance.now()**:
```typescript
// Good - measuring operation duration
const start = performance.now();
await someAsyncOperation();
const end = performance.now();
console.log(`Operation took ${end - start}ms`);

// Good - timing React component renders
useEffect(() => {
  const startTime = performance.now();
  // Component logic
  return () => {
    console.log(`Component active for ${performance.now() - startTime}ms`);
  };
}, []);
```

**When to Use Date.now()**:
```typescript
// Good - wall clock timestamps for logging/storage
const timestamp = Date.now();
await saveToFirestore({ createdAt: timestamp });

// Good - comparing against absolute times
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
if (lastUpdate > fiveMinutesAgo) {
  // Recent update
}
```

**Cross-Browser Compatibility Considerations**:

1. **Precision Reduction (Security)**:
Modern browsers reduce precision to prevent timing attacks:
- Firefox: Rounds to nearest 1ms (since Firefox 60)
- Safari: Rounds to nearest 1ms
- Chrome: Coarsened based on site isolation status

2. **Full Precision Requirements**:
For full microsecond precision, serve with these headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

3. **Practical Implications**:
```typescript
// Due to precision reduction, very fast operations may show 0ms
const start = performance.now();
const result = fastOperation(); // < 1ms
const duration = performance.now() - start; // May be 0 or 1

// For sub-millisecond measurements, run multiple iterations
const iterations = 1000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  fastOperation();
}
const avgDuration = (performance.now() - start) / iterations;
```

**Timestamp Collision Prevention**:
```typescript
// Bad - Date.now() can produce duplicate timestamps
const ids = Array(1000).fill(0).map(() => `id_${Date.now()}`);
// Many duplicates due to 1ms precision

// Better - performance.now() reduces collisions
const ids = Array(1000).fill(0).map(() => `id_${performance.now()}`);
// Fewer duplicates, but still not guaranteed unique

// Best - combine with counter or use crypto.randomUUID()
let counter = 0;
const generateId = () => `${performance.now()}_${counter++}`;
// Or
const generateId = () => crypto.randomUUID();
```

**Common Pitfalls**:

1. **Not Monotonic**: Don't assume `performance.now()` never decreases between calls on different pages
```typescript
// Bad - storing across page loads
localStorage.setItem('lastTime', performance.now());

// Good - use Date.now() for persistent timestamps
localStorage.setItem('lastTime', Date.now());
```

2. **Precision Assumptions**: Don't rely on microsecond precision in production
```typescript
// Bad - assuming microsecond precision
if (performance.now() - start < 0.001) { // Sub-millisecond check
  // May never be true due to coarsening
}

// Good - work with millisecond precision
if (performance.now() - start < 1) {
  // Millisecond-level check
}
```

3. **Negative Durations**: In very rare cases with clock adjustments
```typescript
// Good - defensive coding
const duration = Math.max(0, performance.now() - start);
```

**Performance Comparison Table**:

| Feature | performance.now() | Date.now() |
|---------|------------------|------------|
| Precision | Microseconds (coarsened to ~1ms) | Milliseconds |
| Clock Type | Monotonic (page-relative) | Wall clock (Unix epoch) |
| System Clock Affected | No | Yes |
| Use Case | Duration measurement | Absolute timestamps |
| Cross-page Persistent | No | Yes |
| Browser Support | All modern (2015+) | Universal |

**Alternatives Considered**:
- **Date.now()**: Lower precision, subject to clock adjustments, but suitable for absolute timestamps
- **new Date().getTime()**: Same as Date.now() but creates unnecessary object
- **console.time()/console.timeEnd()**: Good for debugging, not for programmatic timing
- **User Timing API**: More complex, better for performance profiling with Chrome DevTools

**References**:
- [MDN: Performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [Chrome: When Milliseconds Are Not Enough](https://developer.chrome.com/blog/when-milliseconds-are-not-enough-performance-now)
- [MDN: High Precision Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/High_precision_timing)
- [Using performance.now() to Prevent Timestamp Collisions](https://dev.to/jeky1950/using-performancenow-instead-of-datenow-to-prevent-timestamp-collisions-2819)

---

### 5. Firestore Security Rules Best Practices

**Decision**: Implement user-scoped data access with `/users/{uid}/` pattern and read-only public collections with cost-optimized security rules

**Rationale**:
- **Security First**: User-scoped rules ensure users can only access their own data using `request.auth.uid`
- **Cost Optimization**: Security rules that use `get()` or `exists()` incur billable read operations, so minimize their use
- **Granular Permissions**: Separate `get`, `list`, `create`, `update`, `delete` operations for fine-grained control
- **Query Validation**: Security rules are not filters - queries must match rule constraints or the entire request fails

**Best Practices**:

**User-Scoped Data Access Pattern**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile - owner read/write
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // User's subcollection - owner only
    match /users/{userId}/records/{recordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Alternative: document with userId field
    match /tasks/{taskId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

**Read-Only Public Collections**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Option 1: Simple public read, admin-only write
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false; // Only allow via Admin SDK or Firebase Console
    }

    // Option 2: Conditional public read based on field
    match /articles/{articleId} {
      allow read: if resource.data.visibility == 'public';
      allow write: if request.auth != null && request.auth.uid == resource.data.authorId;
    }

    // Option 3: Separate get/list permissions
    match /products/{productId} {
      allow get: if true; // Anyone can get specific product
      allow list: if request.auth != null; // Only authenticated users can list all
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

**Cost Optimization Strategies**:

1. **Avoid get()/exists() in Rules**:
```javascript
// BAD - Each validation reads another document (billed)
match /posts/{postId} {
  allow write: if exists(/databases/$(database)/documents/users/$(request.auth.uid));
  // ^ Every write incurs an additional read charge!
}

// GOOD - Use data already in request or resource
match /posts/{postId} {
  allow write: if request.auth != null; // No extra reads
  allow delete: if request.auth.uid == resource.data.authorId; // Uses existing data
}
```

2. **Implement Client-Side Caching**:
```typescript
// Enable offline persistence (Firebase SDK v9+)
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline cache
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-preconditions') {
      console.warn('Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support persistence');
    }
  });
```

3. **Optimize Query Patterns**:
```typescript
// BAD - Fetches all documents then filters client-side
const snapshot = await getDocs(collection(db, 'posts'));
const userPosts = snapshot.docs.filter(doc => doc.data().userId === currentUser.uid);
// ^ Reads ALL documents (expensive!)

// GOOD - Filter server-side with queries
const q = query(
  collection(db, 'posts'),
  where('userId', '==', currentUser.uid)
);
const snapshot = await getDocs(q);
// ^ Only reads matching documents
```

4. **Use Pagination with Cursors**:
```typescript
// BAD - Loading all documents
const snapshot = await getDocs(collection(db, 'poems'));

// GOOD - Paginate with limits and cursors
const first = query(collection(db, 'poems'), orderBy('order'), limit(25));
const documentSnapshots = await getDocs(first);

// Get next page
const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
const next = query(
  collection(db, 'poems'),
  orderBy('order'),
  startAfter(lastVisible),
  limit(25)
);
```

5. **Batch Operations**:
```typescript
// Batch writes (up to 500 operations)
const batch = writeBatch(db);
poems.forEach((poem) => {
  const ref = doc(db, 'poems', poem.id);
  batch.set(ref, poem, { merge: true });
});
await batch.commit(); // Single network round-trip
```

6. **Minimize Real-time Listeners**:
```typescript
// BAD - Constant real-time listener
const unsubscribe = onSnapshot(collection(db, 'poems'), (snapshot) => {
  // Charged for every document on every update
});

// GOOD - One-time read when needed
const snapshot = await getDocs(collection(db, 'poems'));
// Only charged once
```

7. **Index Management**:
- Delete unused composite indexes (each index increases storage and write costs)
- Use index exemptions for fields that don't need indexing
- Regularly audit indexes via Firebase Console

8. **Document Size Optimization**:
```typescript
// BAD - Large nested objects
const largeDoc = {
  id: 'poem_001',
  metadata: { /* 100+ fields */ },
  history: [ /* large array */ ]
};

// GOOD - Break into smaller documents
// Main document
const poem = { id: 'poem_001', kami: '...', shimo: '...' };
// Metadata in subcollection
const metadata = { /* separate document */ };
```

**Mixed Access Patterns**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Public read, authenticated write
    match /comments/{commentId} {
      allow read: if true;
      allow create: if isSignedIn() && request.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && isOwner(resource.data.userId);
    }
  }
}
```

**Security Rules Testing**:
```javascript
// Use Firebase Emulator Suite for local testing
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}

// Test with Firebase CLI
// firebase emulators:start
// Then run tests against emulator
```

**Query Constraints and Rules**:
```typescript
// Security rules are NOT filters - queries must match constraints
// firestore.rules
match /articles/{articleId} {
  allow list: if request.query.limit <= 50
              && resource.data.visibility == 'public';
}

// Client query MUST include matching where clause
const q = query(
  collection(db, 'articles'),
  where('visibility', '==', 'public'), // Required!
  limit(50)
);
```

**Cost Monitoring**:
- Set up budget alerts in Google Cloud Console
- Monitor reads/writes/deletes in Firebase Console
- Use Firestore usage dashboard to identify expensive queries
- Configure programmatic quotas to prevent runaway costs

**Billing Model Summary**:
- Charged per document read, write, delete
- Charged per index entry read during queries
- Charged for storage (data + metadata + indexes)
- Charged for network egress (download bandwidth)
- Free tier: 50K reads, 20K writes, 20K deletes per day

**Alternatives Considered**:
- **Admin SDK in Backend**: More control but requires server infrastructure and additional complexity
- **Custom Auth Tokens**: More flexible but harder to manage than Firebase Auth
- **Public Write Access**: Never do this - allows abuse and runaway costs
- **No Security Rules**: Firebase requires rules; overly permissive rules are security vulnerabilities

**References**:
- [Firestore Security Rules Best Practices](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firestore Security Rules Examples](https://www.sentinelstand.com/article/firestore-security-rules-examples)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Cost Optimization](https://www.systemsarchitect.io/services/google-firestore/cost-optimization-best-practices)
- [Reduce Firestore Costs by Reducing Reads](https://medium.com/better-programming/firebase-firestore-cut-costs-by-reducing-reads-edfccb538285)
- [How to Reduce Firestore Costs](https://medium.com/firebase-tips-tricks/how-to-reduce-firestore-costs-8cb712473e83)
- [Firestore Pricing and Billing](https://firebase.google.com/docs/firestore/pricing)
- [Firestore Read/Write Optimization Strategies](https://www.javacodegeeks.com/2025/03/firestore-read-write-optimization-strategies.html)

---

## Summary

This research provides comprehensive technical guidance for building a production-ready Vite + React + TypeScript + Firebase SPA:

| Area | Key Decision | Primary Benefit |
|------|--------------|-----------------|
| **Firebase SDK** | Modular SDK v10 with Vite env vars | 80% bundle size reduction via tree-shaking |
| **Vite Optimization** | Manual chunks + route-based code splitting | 40-60% bundle reduction, 70% faster builds |
| **Tailwind CSS** | JIT mode with content purging | <10 KB compressed CSS |
| **Timing APIs** | performance.now() for measurements | Microsecond precision, monotonic clock |
| **Firestore Security** | User-scoped rules + cost optimization | Secure access, minimized billable operations |

All recommendations follow modern best practices for performance, security, and developer experience in 2026.
