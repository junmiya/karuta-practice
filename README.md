# 競技かるた練習 (Karuta Practice)

競技かるたの練習から公式競技・番付までをサポートするWebアプリケーション

**Live Demo:** https://karuta-practice-app.web.app

## Features

### 練習モード (Practice Modes)
- **12枚取り練習** - 4×3グリッドで12枚の取札から選択
- **10問練習** - 8択形式で10問に挑戦、タイム計測付き

### 公式競技 (Official Competition)
- 50問の公式競技モード
- サーバーサイドでの異常値検出・スコア計算
- シーズン制（春戦・夏戦・秋戦・冬戦）

### 番付 (Rankings)
- 本日の番付（デイリーランキング）
- シーズン番付（級位の部・段位の部）
- ベストスコアによる順位付け

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- React Router 6

### Backend
- Firebase Authentication (Google Sign-in)
- Cloud Firestore
- Cloud Functions (Node.js 20)
- Firebase Hosting

## Project Structure

```
├── apps/web/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Firebase services
│   │   ├── types/          # TypeScript types
│   │   └── data/           # Poem data (100 poems)
│   └── ...
├── functions/              # Cloud Functions
│   └── src/
│       ├── submitOfficialSession.ts  # Official submission handler
│       ├── services/       # Score calculation, ranking update
│       └── validators/     # Anomaly detection
├── firebase/               # Firebase configuration
│   ├── firestore.rules     # Security rules
│   └── firestore.indexes.json
└── specs/                  # Feature specifications
```

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/junmiya/karuta-practice.git
cd karuta-practice

# Install dependencies
cd apps/web && npm install
cd ../../functions && npm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Firebase config
```

### Development

```bash
# Start frontend dev server
cd apps/web && npm run dev

# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Google provider)
3. Create a Firestore database
4. Enable Cloud Functions (requires Blaze plan)
5. Copy your Firebase config to `.env.local`

## Score Calculation

```
Score = (correctCount × 100) + max(0, 300 - totalSeconds)
```

- Base score: 100 points per correct answer
- Speed bonus: Up to 300 points for fast completion

## Anomaly Detection

The server validates submissions and marks as invalid if:
- Round count ≠ 50
- Duplicate round indices
- Invalid poem selection
- Too fast (< 200ms for 5+ rounds)
- Too slow (> 60000ms for any round)

## Season System

| Season | Period | Season ID |
|--------|--------|-----------|
| 春戦 (Spring) | Apr - Jun | `YYYY_spring` |
| 夏戦 (Summer) | Jul - Sep | `YYYY_summer` |
| 秋戦 (Autumn) | Oct - Dec | `YYYY_autumn` |
| 冬戦 (Winter) | Jan - Mar | `YYYY_winter` |

## License

MIT

## Author

Built with Claude Code
