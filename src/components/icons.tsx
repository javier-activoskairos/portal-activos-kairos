// Iconos SVG del portal (trazo, heredan currentColor). Sin dependencias.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconAssets({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5Z" />
      <path d="M3 7.5v9L12 21l9-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function IconAlert({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconChat({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export function IconLock({ width = 17, height = 17, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconLogout({ width = 17, height = 17, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconArrow({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconMail({ width = 17, height = 17, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 7L22 6" />
    </svg>
  );
}

export function IconBuilding({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M15 21v-9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9" />
      <path d="M9 8h2M9 12h2" />
    </svg>
  );
}

export function IconSun({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconMoon({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function IconCheck({ width = 14, height = 14, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2.5}
      {...p}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconCalendar({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={1.9}
      {...p}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconPlus({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconClose({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconBilling({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

export function IconTemple({ width = 18, height = 18, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 21h18" />
      <path d="M12 3 3 8h18L12 3Z" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
    </svg>
  );
}

export function IconHourglass({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M6 2h12M6 22h12" />
      <path d="M8 2c0 4 8 6 8 10s-8 6-8 10" />
      <path d="M16 2c0 4-8 6-8 10s8 6 8 10" />
    </svg>
  );
}

export function IconExternal({ width = 14, height = 14, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function IconChevronLeft({ width = 16, height = 16, ...p }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      {...base}
      strokeWidth={2}
      {...p}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconSettings({ width = 19, height = 19, ...p }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
