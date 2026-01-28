import { type ReactNode } from 'react';
import { Header } from './Header';
import { Container } from './ui/Container';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 py-4">
        {/* Note: Children pages are responsible for their own Container/Layout logic if needed, 
            but usually we want a default container. The previous implementation had a container here. 
            We can keep it or let pages define it. 
            Given the request for unification, let's keep a default Container but check if nested containers cause issues.
            Actually, the previous code had `container mx-auto px-4 max-w-6xl`. 
            Our Container default is max-w-7xl, can pass className.
        */}
        {children}
      </main>
      <footer className="bg-white border-t border-neutral-200 mt-auto">
        <Container className="py-4">
          <div className="text-center text-sm text-neutral-500">
            <p>© 2026 百人一首カルタ番付製作委員会</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
