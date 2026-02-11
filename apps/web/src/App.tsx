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
import { UtaawaseRokuPage } from './pages/UtaawaseRokuPage';
import { KyuiMatchPage } from './pages/KyuiMatchPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupCreatePage } from './pages/GroupCreatePage';
import { GroupHomePage } from './pages/GroupHomePage';
import { GroupJoinPage } from './pages/GroupJoinPage';
import { GroupMembersPage } from './pages/GroupMembersPage';
import { GroupEventPage } from './pages/GroupEventPage';
import { GroupEditPage } from './pages/GroupEditPage';
import { TebikiPage } from './pages/TebikiPage';
import { InviteJoinPage } from './pages/InviteJoinPage';
import { EnrollmentPage } from './pages/EnrollmentPage';
import { UchideshiJoinPage } from './pages/UchideshiJoinPage';
import { AdminRoute } from './components/AdminRoute';
import { BillingGuard } from './components/BillingGuard';

export function App() {
  return (
    <ErrorBoundary>
      <CardSizeProvider>
        <BrowserRouter>
          <Layout>
          <Routes>
            {/* 手引タブ（無料） */}
            <Route path="/tebiki" element={<TebikiPage />} />

            {/* 招待参加 */}
            <Route path="/invite/join" element={<InviteJoinPage />} />

            {/* 手習タブ（無料） */}
            <Route path="/" element={<HomePage />} />
            <Route path="/cards" element={<CardsListPage />} />

            {/* 稽古タブ（課金対象） */}
            <Route path="/keiko" element={<BillingGuard><KeikoPage /></BillingGuard>} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice12" element={<BillingGuard><Practice12Page /></BillingGuard>} />
            <Route path="/result" element={<ResultPage />} />

            {/* 稽古録タブ（要ログイン） */}
            <Route path="/keikoroku" element={<SeisekiPage />} />

            {/* 歌合タブ（課金対象） */}
            <Route path="/utaawase" element={<BillingGuard><KyogiPage /></BillingGuard>} />
            <Route path="/entry" element={<BillingGuard><EntryPage /></BillingGuard>} />
            <Route path="/official" element={<BillingGuard><OfficialPage /></BillingGuard>} />
            <Route path="/kyui-exam" element={<BillingGuard><KyuiExamPage /></BillingGuard>} />
            <Route path="/kyui-match" element={<BillingGuard><KyuiMatchPage /></BillingGuard>} />

            {/* 歌合録タブ（要ログイン） */}
            <Route path="/utaawaseroku" element={<UtaawaseRokuPage />} />

            {/* 歌位タブ（要ログイン） */}
            <Route path="/utakurai" element={<BanzukePage />} />

            {/* 入門・内弟子 */}
            <Route path="/enrollment" element={<EnrollmentPage />} />
            <Route path="/join/uchideshi" element={<UchideshiJoinPage />} />

            {/* プロフィール */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* 管理者ページ（admin のみ） */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* 団体機能 */}
            <Route path="/groups" element={<GroupListPage />} />
            <Route path="/groups/create" element={<GroupCreatePage />} />
            <Route path="/groups/:groupId" element={<GroupHomePage />} />
            <Route path="/groups/:groupId/edit" element={<GroupEditPage />} />
            <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
            <Route path="/groups/:groupId/events" element={<GroupEventPage />} />
            <Route path="/join" element={<GroupJoinPage />} />
            <Route path="/musubi/join" element={<GroupJoinPage />} />
          </Routes>
          </Layout>
        </BrowserRouter>
      </CardSizeProvider>
    </ErrorBoundary>
  );
}
