import Image from "next/image";
import { cn } from "@/lib/utils";

type StudelioLogoProps = {
  className?: string;
  /** Hauteur visuelle (largeur suit le ratio du fichier). */
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const sizeClass: Record<NonNullable<StudelioLogoProps["size"]>, string> = {
  sm: "h-7 w-auto sm:h-8",
  md: "h-8 w-auto sm:h-9",
  lg: "h-10 w-auto sm:h-12 md:h-[3.25rem]",
};

/**
 * Logo Studelio (fichier `public/studelio-logo.png`).
 * À utiliser dans les en-têtes ; prévoir un titre de page séparé si besoin SEO.
 */
export function StudelioLogo({ className, size = "md", priority }: StudelioLogoProps) {
  return (
    <Image
      src="/studelio-logo.png"
      alt="Studelio"
      width={360}
      height={100}
      sizes="(max-width: 640px) 200px, 260px"
      className={cn("object-contain object-left", sizeClass[size], className)}
      priority={priority}
    />
  );
}
