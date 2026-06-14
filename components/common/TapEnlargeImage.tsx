'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  thumbClassName?: string;
};

export function TapEnlargeImage({
  src,
  alt,
  width = 80,
  height = 80,
  className,
  thumbClassName = 'w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg border border-white/10 flex-shrink-0',
}: Props) {
  const [open, setOpen] = useState(false);
  const useNative = src.startsWith('blob:') || src.startsWith('data:');

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-zoom-in rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${className ?? ''}`}
        aria-label={`${alt}を拡大表示`}
      >
        {useNative ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={thumbClassName} />
        ) : (
          <Image src={src} alt={alt} width={width} height={height} className={thumbClassName} />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 z-10 rounded-full bg-neutral-800/90 px-3 py-1.5 text-sm text-stone-200 hover:bg-neutral-700"
            aria-label="閉じる"
          >
            閉じる
          </button>
          <div
            className="relative max-h-[85vh] max-w-[min(92vw,720px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {useNative ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <Image
                src={src}
                alt={alt}
                width={1200}
                height={1200}
                className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                sizes="92vw"
                priority
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
