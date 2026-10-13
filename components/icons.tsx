type P = { size?: number; className?: string };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconMail({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m3 7 8.2 5.6a1.4 1.4 0 0 0 1.6 0L21 7" />
    </svg>
  );
}

export function IconSparkles({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v4M12 17v4M4.5 7.5l2.8 2.8M16.7 13.7l2.8 2.8M3 12h4M17 12h4M4.5 16.5l2.8-2.8M16.7 10.3l2.8-2.8" />
    </svg>
  );
}

export function IconCopy({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconCheck({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}

export function IconRefresh({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20 11a8 8 0 0 0-14-4.5L4 9" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14 4.5L20 15" />
      <path d="M20 20v-5h-5" />
    </svg>
  );
}

export function IconTrash({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6 7l1 12.2A1.8 1.8 0 0 0 8.8 21h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconLink({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10.5 13.5a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M13.5 10.5a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

export function IconKey({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M17 4l2 2M14 7l2 2" />
    </svg>
  );
}

export function IconBack({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconEye({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.3 3.1" />
      <path d="M6.3 7.9A16.6 16.6 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 3.3-.6" />
    </svg>
  );
}

export function IconClock({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconShield({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconChevron({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconPlus({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconBulk({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="4" width="7" height="7" rx="2" />
      <rect x="14" y="4" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <path d="M14 15.5h7M14 19.5h4.5" />
    </svg>
  );
}

export function IconInbox({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 13.5 5.6 5.4A2 2 0 0 1 7.5 4h9a2 2 0 0 1 1.9 1.4L21 13.5" />
      <path d="M3 13.5h5l1.2 2.6h5.6l1.2-2.6H21V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.5Z" />
    </svg>
  );
}

export function IconDownload({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v11" />
      <path d="m7.5 10.5 4.5 4 4.5-4" />
      <path d="M4 18.5h16" />
    </svg>
  );
}

export function IconTerminal({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2.5" y="4" width="19" height="16" rx="3" />
      <path d="m7 10 2.5 2L7 14" />
      <path d="M12.5 14.5h4" />
    </svg>
  );
}

export function IconStop({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}

export function IconAlert({ size = 20, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5h.01" />
    </svg>
  );
}