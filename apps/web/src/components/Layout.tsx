import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
      <footer className="bg-white border-t border-neutral-200 mt-auto">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center text-sm text-neutral-700">
            <p className="font-medium">百人一首 競技かるた練習 - MVP版（段階0）</p>
            <p className="mt-2 text-xs text-neutral-700">
              練習モードのみ実装中 | 認証・公式提出・番付機能は開発中
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
