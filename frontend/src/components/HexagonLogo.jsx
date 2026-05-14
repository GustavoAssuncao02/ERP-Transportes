export default function HexagonLogo({ variant = 'compact', className = '' }) {
  const isLarge = variant === 'large';
  const classes = ['hexagon-logo', `hexagon-logo--${variant}`, className].filter(Boolean).join(' ');

  if (isLarge) {
    return (
      <svg className={classes} viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon points="80,8 148,44 148,116 80,152 12,116 12,44" fill="#dde8e7" stroke="#c5d8d6" strokeWidth="1" />
        <polygon points="80,22 134,52 134,108 80,138 26,108 26,52" fill="#1a5f5a" />
        <rect x="52" y="52" width="16" height="44" rx="8" fill="white" />
        <rect x="92" y="52" width="16" height="44" rx="8" fill="white" />
        <rect x="72" y="72" width="16" height="34" rx="8" fill="#e87722" />
        <circle cx="80" cy="46" r="8" fill="#f5a623" />
        <circle cx="60" cy="106" r="6" fill="white" />
        <circle cx="100" cy="106" r="6" fill="white" />
      </svg>
    );
  }

  return (
    <svg className={classes} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="18,2 33,10 33,26 18,34 3,26 3,10" fill="#155f59" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="10" y="10" width="4" height="14" rx="2" fill="white" />
      <rect x="22" y="10" width="4" height="14" rx="2" fill="white" />
      <rect x="16" y="16" width="4" height="10" rx="2" fill="#f5a623" />
      <circle cx="18" cy="10" r="2.5" fill="#f5a623" />
      <circle cx="12" cy="26" r="2" fill="white" />
      <circle cx="24" cy="26" r="2" fill="white" />
    </svg>
  );
}
