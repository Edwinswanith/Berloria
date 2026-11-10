import type { ReactNode, SVGProps } from "react";

/**
 * One icon family for the whole site: 24px grid, 1.4 stroke, round joins.
 * Icons are decorative by default; give the surrounding control an accessible name.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, className = "h-5 w-5", ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {children}
    </svg>
  );
}

export const BagIcon = (p: IconProps) => <Icon {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M3 7h18M3 12h18M3 17h12" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const ChevronRightIcon = (p: IconProps) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const PackageIcon = (p: IconProps) => <Icon {...p}><path d="m3.5 7.5 8.5-4 8.5 4v9l-8.5 4-8.5-4v-9Z" /><path d="m3.5 7.5 8.5 4 8.5-4M12 11.5v9" /></Icon>;
export const TruckIcon = (p: IconProps) => <Icon {...p}><path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.500h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Icon>;
export const RulerIcon = (p: IconProps) => <Icon {...p}><path d="m3 16 13-13 5 5L8 21l-5-5Z" /><path d="m7.5 11.5 2 2M10.5 8.500l2 2M13.5 5.5l2 2" /></Icon>;
export const ScissorsIcon = (p: IconProps) => <Icon {...p}><circle cx="6" cy="6.5" r="2.5" /><circle cx="6" cy="17.5" r="2.5" /><path d="M8 8l12 9M8 16l12-9" /></Icon>;
export const LockIcon = (p: IconProps) => <Icon {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.5" /></Icon>;
export const ReturnIcon = (p: IconProps) => <Icon {...p}><path d="M4 9h11a5 5 0 0 1 0 10H9" /><path d="M7.5 5.5 4 9l3.5 3.5" /></Icon>;
export const MinusIcon = (p: IconProps) => <Icon {...p}><path d="M6 12h12" /></Icon>;
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 6v12M6 12h12" /></Icon>;
export const TrashIcon = (p: IconProps) => <Icon {...p}><path d="M4.5 7h15M9.5 7V4.500h5V7M6.5 7l.8 12.500h9.400L17.5 7" /></Icon>;
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Icon>;
export const UserIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.400 1.900 7 5.5" /></Icon>;
