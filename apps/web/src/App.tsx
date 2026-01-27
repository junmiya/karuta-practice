import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CardSizeProvider } from './contexts/CardSizeContext';
import { HomePage } from './pages/HomePage';
import { PracticePage } from './pages/PracticePage';
import { Practice12Page } from './pages/Practice12Page';
import { ResultPage } from './pages/ResultPage';
import { CardsListPage } from './pages/CardsListPage';
import { BanzukePage } from './pages/BanzukePage';
import { ProfilePage } from './pages/ProfilePage';
import { KeikoPage } from './pages/KeikoPage';
import { KyogiPage } from './pages/KyogiPage';
import { SeisekiPage } from './pages/SeisekiPage';
import { EntryPage } from './pages/EntryPage';
import { OfficialPage } from './pages/OfficialPage';
import { AdminPage } from './pages/AdminPage';
import { KyuiExamPage } from './pages/KyuiExamPage';

export function App() {
  return (
    <ErrorBoundary>
      <CardSizeProvider>
        <BrowserRouter>
          <Layout>
          <Routes>
            {/* 手習タブ（無料） */}
            <Route path="/" element={<HomePage />} />
            <Route path="/cards" element={<CardsListPage />} />

            {/* 稽古タブ */}
            <Route path="/keiko" element={<KeikoPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice12" element={<Practice12Page />} />
            <Route path="/result" element={<ResultPage />} />

            {/* 稽古録タブ（要ログイン） */}
            <Route path="/keikoroku" element={<SeisekiPage />} />

            {/* 歌合タブ（要ログイン） */}
            <Route path="/utaawase" element={<KyogiPage />} />
            <Route path="/entry" element={<EntryPage />} />
            <Route path="/official" element={<OfficialPage />} />
            <Route path="/kyui-exam" element={<KyuiExamPage />} />

            {/* 歌位タブ（要ログイン） */}
            <Route path="/utakurai" element={<BanzukePage />} />

            {/* プロフィール */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* 管理者ページ */}
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          </Layout>
        </BrowserRouter>
      </CardSizeProvider>
    </ErrorBoundary>
  );
}
