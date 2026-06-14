'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function PullToRefresh() {
  const router = useRouter();
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      setRefreshing(false);
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [router]);

  useEffect(() => {
    setEnabled(isStandaloneApp());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const threshold = 72;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 8) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;
      if (delta > 0 && window.scrollY <= 8) {
        const next = Math.min(delta * 0.45, 96);
        offsetRef.current = next;
        setOffset(next);
        if (delta > 12) e.preventDefault();
      } else {
        offsetRef.current = 0;
        setOffset(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (offsetRef.current >= threshold && !refreshing) {
        void onRefresh();
      } else {
        offsetRef.current = 0;
        setOffset(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, onRefresh, refreshing]);

  if (!enabled) return null;

  const showBar = offset > 0 || refreshing;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] flex justify-center"
      style={{
        height: showBar ? Math.max(offset, refreshing ? 48 : 0) : 0,
        transition: pulling.current ? 'none' : 'height 0.2s ease',
      }}
    >
      <div className="mt-2 rounded-full bg-neutral-800/90 px-3 py-1 text-xs text-stone-300 shadow">
        {refreshing ? '更新中…' : offset > 48 ? '離して更新' : '下に引いて更新'}
      </div>
    </div>
  );
}
