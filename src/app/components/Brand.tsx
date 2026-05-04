export function BrandPattern({ opacity = 0.5, size = 60 }: { opacity?: number; size?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDYwdjYwSDB6Ii8+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgc3Ryb2tlPSIjNEE5MEUyIiBzdHJva2Utd2lkdGg9Ii4yIiBvcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')`,
        backgroundSize: `${size}px ${size}px`,
        opacity,
      }}
    />
  );
}

type BrandLogoSize = "xs" | "sm" | "md" | "lg";
type BrandLogoTheme = "auto" | "light" | "dark";

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  title?: string;
  logoTheme?: BrandLogoTheme;
}

/**
 * В проекте больше не используются картинные логотипы.
 * Компонент оставлен для совместимости со старыми импортами и ничего не рисует.
 */
export function BrandLogo(_props: BrandLogoProps) {
  return null;
}

export function BrandWordmark({
  textClassName = "",
  textColor = "var(--gray-900)",
}: {
  logoSize?: BrandLogoSize;
  textClassName?: string;
  textColor?: string;
  logoTheme?: BrandLogoTheme;
}) {
  return (
    <span
      className={`inline-flex items-center font-extrabold tracking-tight truncate ${textClassName}`.trim()}
      style={{ color: textColor }}
    >
      Версиум
    </span>
  );
}
