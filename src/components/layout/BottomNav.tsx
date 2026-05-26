'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Grid3X3, ShoppingCart, Heart, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname && pathname.startsWith('/seller')) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Categories', href: '/search', icon: Grid3X3 },
    { label: 'Cart', href: '/checkout', icon: ShoppingCart },
    { label: 'Wishlist', href: '/saved', icon: Heart },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-md border border-white/5 shadow-lg rounded-xl md:hidden transition-premium">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : item.href !== '#' && pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-premium relative ${
                isActive
                  ? 'text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              onClick={(e) => {
                if (item.href.startsWith('/#')) {
                  e.preventDefault();
                  router.push('/');
                  setTimeout(() => {
                    const el = document.getElementById('nearby-shops');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              <div className="relative flex flex-col items-center">
                <Icon
                  className={`w-4 h-4 mb-0.5 transition-premium ${
                    isActive 
                      ? 'scale-105 text-zinc-50 stroke-[2px]' 
                      : 'text-zinc-500'
                  }`}
                />
                <span className="font-medium tracking-tight text-[9px]">{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 bg-orange-500 rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
