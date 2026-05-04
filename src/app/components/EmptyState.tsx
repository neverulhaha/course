import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  pattern?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, pattern = true }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {pattern && (
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCAwaDYwdjYwSDB6Ii8+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgc3Ryb2tlPSIjNEE5MEUyIiBzdHJva2Utd2lkdGg9Ii4yIiBvcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-50"></div>
      )}
      
      <div className="text-center max-w-md relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-[#4A90E2]/10 to-[#2ECC71]/10 border border-[#4A90E2]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-[#4A90E2]" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
        
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
