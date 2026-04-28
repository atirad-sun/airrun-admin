// IC icon set — verbatim port from airrun-design/project/admin-base.jsx:4-39.
// Hand-rolled SVGs (rather than lucide) so visual fidelity matches the design
// prototype exactly — same stroke widths, same paths, same dimensions.

import type { ReactElement } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IC: Record<string, ReactElement> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  parks: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  bugs: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 016 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M20 13h-4M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
    </svg>
  ),
  feedback: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 4V2M12 22v-2" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...stroke}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  arrowUp: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  arrowDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  alertCircle: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  tag: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  link: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...stroke}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  database: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  send: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  verified: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  menu: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

// Brand mark — used by Sidebar collapsed state and TopBar avatar.
export function AirrunIcon({ size = 28, color = "#61D0AB" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M116.139 221.949C96.623 188.147 108.205 144.923 142.007 125.407L203.213 90.0704C222.729 123.873 211.147 167.097 177.344 186.613L116.139 221.949Z"
        fill={color}
      />
      <path
        d="M52.3369 165.879C32.8209 132.076 44.4025 88.853 78.2053 69.3369L139.411 34.0001C158.927 67.8028 147.345 111.026 113.542 130.542L52.3369 165.879Z"
        fill={color}
      />
    </svg>
  );
}

// Full wordmark — sidebar expanded state.
export function AirrunLogo({ width = 90, height = 31 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 230 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M46.786 72.0518C40.1351 60.532 44.0821 45.8017 55.6019 39.1507L76.4603 27.1081C83.1113 38.6279 79.1643 53.3582 67.6445 60.0092L46.786 72.0518Z" fill="white" />
      <path d="M25.0426 52.9434C18.3917 41.4236 22.3386 26.6933 33.8585 20.0423L54.7169 7.99969C61.3679 19.5195 57.4209 34.2498 45.9011 40.9008L25.0426 52.9434Z" fill="white" />
      <path d="M207.114 30.3926C209.817 30.3926 211.985 31.182 213.618 32.761C215.25 34.3399 216.066 36.6815 216.066 39.7858V52.0693H211.048V40.4281C211.048 38.5548 210.607 37.1498 209.724 36.2132C208.841 35.2498 207.583 34.7681 205.95 34.7681C204.104 34.7681 202.645 35.3301 201.575 36.454C200.504 37.5513 199.969 39.1436 199.969 41.231V52.0693H194.951V30.6334H199.728V33.4032C200.558 32.4131 201.602 31.6637 202.859 31.1553C204.117 30.6468 205.536 30.3926 207.114 30.3926Z" fill="white" />
      <path d="M189.184 30.6338V52.0697H184.407V49.34C183.605 50.3034 182.601 51.0528 181.397 51.588C180.192 52.0964 178.895 52.3507 177.503 52.3507C174.639 52.3507 172.378 51.5612 170.719 49.9823C169.086 48.3766 168.27 46.0082 168.27 42.8771V30.6338H173.288V42.1947C173.288 44.1215 173.716 45.5667 174.573 46.5301C175.456 47.4667 176.7 47.935 178.306 47.935C180.099 47.935 181.517 47.3864 182.561 46.2892C183.631 45.1652 184.167 43.5596 184.167 41.4722V30.6338H189.184Z" fill="white" />
      <path d="M157.154 33.7645C158.599 31.5166 161.142 30.3926 164.781 30.3926V35.1695C164.353 35.0892 163.965 35.0491 163.617 35.0491C161.663 35.0491 160.138 35.6244 159.041 36.7752C157.944 37.8992 157.395 39.5316 157.395 41.6725V52.0693H152.377V30.6334H157.154V33.7645Z" fill="white" />
      <path d="M141.296 33.7645C142.742 31.5166 145.284 30.3926 148.923 30.3926V35.1695C148.495 35.0892 148.107 35.0491 147.759 35.0491C145.806 35.0491 144.28 35.6244 143.183 36.7752C142.086 37.8992 141.537 39.5316 141.537 41.6725V52.0693H136.52V30.6334H141.296V33.7645Z" fill="white" />
      <path d="M125.719 30.6339H130.736V52.0698H125.719V30.6339ZM128.248 27.1014C127.338 27.1014 126.575 26.8204 125.96 26.2584C125.344 25.6697 125.036 24.9471 125.036 24.0907C125.036 23.2344 125.344 22.5252 125.96 21.9632C126.575 21.3745 127.338 21.0801 128.248 21.0801C129.158 21.0801 129.92 21.3611 130.536 21.9231C131.151 22.4583 131.459 23.1407 131.459 23.9703C131.459 24.8534 131.151 25.6028 130.536 26.2183C129.947 26.807 129.184 27.1014 128.248 27.1014Z" fill="white" />
      <path d="M119.956 30.6334V52.0693H115.179V49.2995C114.35 50.3165 113.32 51.0792 112.089 51.5876C110.884 52.0961 109.546 52.3503 108.074 52.3503C105.987 52.3503 104.114 51.8954 102.454 50.9855C100.822 50.0756 99.5374 48.791 98.6008 47.1318C97.6909 45.4726 97.236 43.5458 97.236 41.3514C97.236 39.1569 97.6909 37.2435 98.6008 35.6111C99.5374 33.9518 100.822 32.6673 102.454 31.7574C104.114 30.8475 105.987 30.3926 108.074 30.3926C109.466 30.3926 110.737 30.6334 111.888 31.1151C113.065 31.5968 114.082 32.306 114.939 33.2427V30.6334H119.956ZM108.636 48.0551C110.483 48.0551 112.008 47.4396 113.213 46.2086C114.417 44.9776 115.019 43.3585 115.019 41.3514C115.019 39.3443 114.417 37.7252 113.213 36.4942C112.008 35.2632 110.483 34.6476 108.636 34.6476C106.79 34.6476 105.264 35.2632 104.06 36.4942C102.883 37.7252 102.294 39.3443 102.294 41.3514C102.294 43.3585 102.883 44.9776 104.06 46.2086C105.264 47.4396 106.79 48.0551 108.636 48.0551Z" fill="white" />
    </svg>
  );
}
