export const IconPen = ({ stroke = 1 }: { stroke?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={2 * stroke}
    strokeMiterlimit={10}
  >
    <rect x="23" y="57" width="18" height="6" />
    <rect x="19" y="47" width="26" height="10" />
    <polyline points="41,47 41,43 48,30 32,1 16,30 23,43 23,47" />
    <circle cx="32" cy="28.875" r="4" />
    <line x1="32" y1="1" x2="32" y2="25" />
  </svg>
);
