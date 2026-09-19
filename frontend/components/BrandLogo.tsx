interface BrandLogoProps {
  /** "icon" = compass only, "full" = icon + wordmark */
  variant?: "icon" | "full";
  size?: number;
  className?: string;
}

export default function BrandLogo({ variant = "full", size = 40, className = "" }: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={className}
        aria-label="Planadviros icon"
      >
        <circle cx="32" cy="32" r="32" fill="#1e3a8a" />
        <path
          d="M32 4 L33.8 10.2 L39.4 7.6 L40 14 L46.2 14 L44.5 20 L50.4 22.5 L46.7 27.4
             L51.4 31.2 L46.7 35 L50.4 39.9 L44.5 42.4 L46.2 48.4 L40 48.4
             L39.4 54.8 L33.8 52.2 L32 58.4 L30.2 52.2 L24.6 54.8 L24 48.4 L17.8 48.4
             L19.5 42.4 L13.6 39.9 L17.3 35 L12.6 31.2 L17.3 27.4 L13.6 22.5
             L19.5 20 L17.8 14 L24 14 L24.6 7.6 L30.2 10.2 Z"
          fill="none"
          stroke="#d4a017"
          strokeWidth="1.2"
          opacity="0.6"
        />
        <polygon
          points="32,13 34.3,27.5 41.2,23.8 37.5,29.7 52,32 37.5,34.3 41.2,40.2 34.3,36.5 32,51 29.7,36.5 22.8,40.2 26.5,34.3 12,32 26.5,29.7 22.8,23.8 29.7,27.5"
          fill="#d4a017"
        />
        <circle cx="32" cy="32" r="5.5" fill="#1e3a8a" />
        <circle cx="32" cy="32" r="3" fill="#d4a017" />
      </svg>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="Planadviros">
      {/* Icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
        <circle cx="32" cy="32" r="32" fill="#1e3a8a" />
        <path
          d="M32 4 L33.8 10.2 L39.4 7.6 L40 14 L46.2 14 L44.5 20 L50.4 22.5 L46.7 27.4
             L51.4 31.2 L46.7 35 L50.4 39.9 L44.5 42.4 L46.2 48.4 L40 48.4
             L39.4 54.8 L33.8 52.2 L32 58.4 L30.2 52.2 L24.6 54.8 L24 48.4 L17.8 48.4
             L19.5 42.4 L13.6 39.9 L17.3 35 L12.6 31.2 L17.3 27.4 L13.6 22.5
             L19.5 20 L17.8 14 L24 14 L24.6 7.6 L30.2 10.2 Z"
          fill="none"
          stroke="#d4a017"
          strokeWidth="1.2"
          opacity="0.6"
        />
        <polygon
          points="32,13 34.3,27.5 41.2,23.8 37.5,29.7 52,32 37.5,34.3 41.2,40.2 34.3,36.5 32,51 29.7,36.5 22.8,40.2 26.5,34.3 12,32 26.5,29.7 22.8,23.8 29.7,27.5"
          fill="#d4a017"
        />
        <circle cx="32" cy="32" r="5.5" fill="#1e3a8a" />
        <circle cx="32" cy="32" r="3" fill="#d4a017" />
      </svg>
      {/* Wordmark */}
      <span className="leading-none">
        <span
          className="block font-bold tracking-tight"
          style={{ fontSize: size * 0.45, color: "#1e3a8a", letterSpacing: "-0.02em" }}
        >
          <span style={{ color: "#1e3a8a" }}>plan</span>
          <span style={{ color: "#d4a017" }}>ad</span>
          <span style={{ color: "#1e3a8a" }}>viros</span>
        </span>
        <span
          className="block uppercase tracking-widest"
          style={{ fontSize: size * 0.18, color: "#6b7280", letterSpacing: "0.18em", marginTop: 1 }}
        >
          Tours &amp; Guidance
        </span>
      </span>
    </span>
  );
}
