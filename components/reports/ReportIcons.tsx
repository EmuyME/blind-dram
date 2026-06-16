'use client';

/** レポート用インラインSVGアイコン（キャプチャ互換） */

const iconStyle = { display: 'block' as const };

export function IconGlass({ size = 48, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={iconStyle}>
      <path
        d="M18 8h12l-2 14h-8L18 8zM16 22h16l-3 18H19L16 22z"
        stroke={color}
        strokeWidth="1.5"
        fill={`${color}22`}
      />
      <ellipse cx="24" cy="42" rx="10" ry="2" fill={`${color}33`} />
    </svg>
  );
}

export function IconSeal({ size = 56, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" style={iconStyle}>
      <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="1.5" fill={`${color}18`} />
      <circle cx="28" cy="28" r="18" stroke={color} strokeWidth="0.75" strokeDasharray="3 2" />
      <text x="28" y="24" textAnchor="middle" fontSize="7" fill={color} fontWeight="700">
        BLIND
      </text>
      <text x="28" y="33" textAnchor="middle" fontSize="7" fill={color} fontWeight="700">
        DRAM
      </text>
    </svg>
  );
}

export function IconCrown({ size = 28, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={iconStyle}>
      <path d="M4 20h20v3H4v-3zm2-8l4 5 4-8 4 8 4-5 2 8H6l0-8z" fill={color} />
    </svg>
  );
}

export function IconStar({ size = 28, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={iconStyle}>
      <path
        d="M14 3l3.2 6.5 7.2 1-5.2 5 1.2 7.2L14 19.5 7.6 22.7l1.2-7.2-5.2-5 7.2-1L14 3z"
        fill={color}
      />
    </svg>
  );
}

export function IconTrendUp({ size = 28, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={iconStyle}>
      <path d="M4 20h20M8 16l4-6 4 3 6-10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 3h6v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconWreath({ size = 28, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={iconStyle}>
      <ellipse cx="14" cy="14" rx="10" ry="10" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M8 10c2-2 4-2 6 0M20 10c-2-2-4-2-6 0M8 18c2 2 4 2 6 0M20 18c-2 2-4 2-6 0" stroke={color} strokeWidth="1" />
    </svg>
  );
}

export function IconCalendar({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
      <path d="M3 9h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="1.5" />
      <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" stroke={color} strokeWidth="1.5" />
      <circle cx="17" cy="9" r="2.5" stroke={color} strokeWidth="1.2" />
      <path d="M14 20c.5-2.5 2-4 5-4" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

export function IconBottle({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M9 3h6v3l-1 4h-4L9 6V3zM8 10h8v11H8V10z" stroke={color} strokeWidth="1.5" fill={`${color}18`} />
    </svg>
  );
}

export function IconTrophy({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M8 4h8v6c0 3-1.5 5-4 5s-4-2-4-5V4z" stroke={color} strokeWidth="1.5" fill={`${color}18`} />
      <path d="M6 6H4c0 2 1 4 3 4M18 6h2c0 2-1 4-3 4M10 15v3h4v-3M8 20h8" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function IconMedal({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <circle cx="12" cy="14" r="6" stroke={color} strokeWidth="1.5" fill={`${color}22`} />
      <path d="M10 4l2 6 2-6M8 4h8" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function IconMountain({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M3 20h18L14 6l-4 8-3-4-4 10z" stroke={color} strokeWidth="1.5" fill={`${color}18`} />
    </svg>
  );
}

export function IconScales({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M12 4v16M6 8h12M4 12h4l-2 6M16 12h4l-2 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconChart({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <rect x="4" y="12" width="4" height="8" fill={color} rx="1" />
      <rect x="10" y="8" width="4" height="12" fill={color} rx="1" opacity="0.8" />
      <rect x="16" y="4" width="4" height="16" fill={color} rx="1" opacity="0.6" />
    </svg>
  );
}

export function IconClipboard({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <rect x="5" y="4" width="14" height="18" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}12`} />
      <rect x="9" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth="1.5" fill={color} />
    </svg>
  );
}

export function IconDown({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <path d="M12 4v12M8 12l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20h16" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function IconSigma({ size = 24, color = '#c9a227' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconStyle}>
      <text x="12" y="17" textAnchor="middle" fontSize="16" fill={color} fontWeight="700" fontFamily="serif">
        Σ
      </text>
    </svg>
  );
}
