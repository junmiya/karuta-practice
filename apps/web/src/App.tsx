import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { PracticePage } from './pages/PracticePage';
import { Practice12Page } from './pages/Practice12Page';
import { ResultPage } from './pages/ResultPage';
import { CardsListPage } from './pages/CardsListPage';
import { BanzukePage } from './pages/BanzukePage';
import { ProfilePage } from './pages/ProfilePage';
import { KensaiPage } from './pages/KensaiPage';
import { KyogiPage } from './pages/KyogiPage';
import { SeisekiPage } from './pages/SeisekiPage';
import { EntryPage } from './pages/EntryPage';
import { OfficialPage } from './pages/OfficialPage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* 基本タブ（無料） */}
            <Route path="/" element={<HomePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice12" element={<Practice12Page />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/cards" element={<CardsListPage />} />

            {/* 研鑽タブ（要ログイン/課金） */}
            <Route path="/kensai" element={<KensaiPage />} />

            {/* 競技タブ（要ログイン） */}
            <Route path="/kyogi" element={<KyogiPage />} />
            <Route path="/entry" element={<EntryPage />} />
            <Route path="/official" element={<OfficialPage />} />
            <Route path="/banzuke" element={<BanzukePage />} />

            {/* 成績タブ（要ログイン/課金） */}
            <Route path="/seiseki" element={<SeisekiPage />} />

            {/* プロフィール */}
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
