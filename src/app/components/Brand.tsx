export function BrandPattern({ opacity = 0.5, size = 60 }: { opacity?: number; size?: number }) {
  const base64Pattern = `PHN2ZyB3aWR0aD0iJHtzaXplfSIgaGVpZ2h0PSIke3NpemV9IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0iTTAgMGgke3NpemV9diR7c2l6ZX1IMHoiLz48cGF0aCBkPSJNMCAwaCR7c2l6ZX12JHtzaXplfUgweiIgc3Ryb2tlPSIjNEE5MEUyIiBzdHJva2Utd2lkdGg9Ii4yIiBvcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+`;
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDYwdjYwSDB6Ii8+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgc3Ryb2tlPSIjNEE5MEUyIiBzdHJva2Utd2lkdGg9Ii4yIiBvcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')`,
        opacity
      }}
    />
  );
}

export function BrandLogo({ size = "md", withPattern = true }: { size?: "sm" | "md" | "lg", withPattern?: boolean }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl"
  };

  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] flex items-center justify-center relative overflow-hidden`}>
      {withPattern && (
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6Ii8+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9Ii41IiBvcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
      )}
      <span className={`text-white font-bold relative z-10 ${size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-xl'}`}>
        В
      </span>
    </div>
  );
}
