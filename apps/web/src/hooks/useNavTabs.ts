import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Layers, Target, Swords, Users, Crown, Mail } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export interface NavTab {
  path: string;
  label: string;
  icon: LucideIcon;
  /** ログイン＋プロフィール登録が必要なタブ */
  required?: boolean;
}

/** メインナビゲーションのタブ定義（上部タブ・下部メニュー共通） */
export const NAV_TABS: NavTab[] = [
  { path: '/tebiki', label: '手引', icon: BookOpen },
  { path: '/tenarai', label: '手習', icon: Layers },
  { path: '/keiko', label: '稽古', icon: Target, required: true },
  { path: '/utaawase', label: '歌合', icon: Swords, required: true },
  { path: '/groups', label: '結び', icon: Users, required: true },
  { path: '/utakurai', label: '歌位', icon: Crown, required: true },
  { path: '/bulletin', label: '便り', icon: Mail, required: true },
];

/** タブのアクティブ判定と遷移処理 */
export function useNavTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, isProfileComplete } = useAuthContext();

  const isActive = useCallback((path: string) => {
    switch (path) {
      case '/tebiki':
        return pathname === '/tebiki';
      case '/tenarai':
        return pathname === '/' || pathname === '/cards' || pathname === '/oboetenai';
      case '/keiko':
        return ['/keiko', '/practice', '/practice12', '/result'].includes(pathname);
      case '/utakurai':
        return pathname === '/utakurai';
      case '/utaawase':
        return ['/utaawase', '/entry', '/official', '/kyui-exam', '/kyui-match'].includes(pathname);
      case '/groups':
        return pathname.startsWith('/groups') || pathname.startsWith('/musubi');
      case '/bulletin':
        return pathname.startsWith('/bulletin');
      default:
        return pathname.startsWith(path);
    }
  }, [pathname]);

  const goTo = useCallback((tab: NavTab) => {
    // 手習は「/」がトップ
    if (tab.path === '/tenarai') {
      navigate('/');
      return;
    }
    if (tab.required && (!isAuthenticated || !isProfileComplete)) {
      navigate('/profile');
      return;
    }
    navigate(tab.path);
  }, [navigate, isAuthenticated, isProfileComplete]);

  return { tabs: NAV_TABS, isActive, goTo, isProfileComplete };
}
