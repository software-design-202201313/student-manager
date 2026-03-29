import { ReactNode } from 'react';
import Header from './Header';

export default function SimpleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="p-4 max-w-4xl w-full mx-auto">{children}</main>
    </div>
  );
}

