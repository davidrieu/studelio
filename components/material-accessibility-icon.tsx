import type { SVGProps } from "react";

/**
 * Icône « accessibility » (Material Symbols Outlined, 24px).
 * Même pictogramme que sur Android / écosystème Google pour l’accessibilité.
 * Licence : Apache-2.0 (Google Fonts / Material Symbols).
 */
export function MaterialAccessibilityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M423.5-743.5Q400-767 400-800t23.5-56.5Q447-880 480-880t56.5 23.5Q560-833 560-800t-23.5 56.5Q513-720 480-720t-56.5-23.5ZM360-80v-520H120v-80h720v80H600v520h-80v-240h-80v240h-80Z" />
    </svg>
  );
}
