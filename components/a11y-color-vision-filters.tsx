/**
 * Filtres SVG (feColorMatrix) pour modes daltoniens — référence courante type simulation CVD.
 * Référencés depuis globals.css via filter: url(#…).
 */
export function A11yColorVisionFilters() {
  return (
    <svg
      aria-hidden
      focusable="false"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="studelio-a11y-cvd-prot" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="studelio-a11y-cvd-deut" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="studelio-a11y-cvd-trit" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
