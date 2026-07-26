'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/** 参加URL用QRコード（会場でスマホをかざして参加） */
export function JoinQrCode({
  url,
  size = 168,
  caption = 'スマホのカメラで読み取って参加',
}: {
  url: string;
  size?: number;
  caption?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const safeUrl = url.trim();
  if (!ready || !safeUrl) {
    return (
      <div className="flex flex-col items-center gap-3" aria-hidden>
        <div
          className="rounded-2xl bg-neutral-700/50 animate-pulse"
          style={{ width: size + 24, height: size + 24 }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3 shadow-inner">
        <QRCodeSVG
          value={safeUrl}
          size={size}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#3d2e1f"
        />
      </div>
      {caption && <p className="text-xs text-stone-400 text-center leading-relaxed">{caption}</p>}
    </div>
  );
}
