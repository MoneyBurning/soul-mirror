'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const ITEMS = [
  { href: '/dashboard', icon: '🏠', label: '홈' },
  { href: '/reading', icon: '🔮', label: '리딩' },
  { href: '/timeline', icon: '📜', label: '타임라인' },
  { href: '/profile', icon: '👤', label: '프로필' },
];

export default function MobileNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-purple-500/20 bg-[#160f28]/95 backdrop-blur sm:hidden">
      {ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-amber-300' : 'text-purple-300/70'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
