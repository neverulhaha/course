import { cn } from "@/app/components/ui/utils";

export interface SettingsFormProps {
  children: React.ReactNode;
  className?: string;
}

/** Vertical rhythm for labeled fields inside a settings section */
export function SettingsForm({ children, className }: SettingsFormProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4 sm:gap-4 md:gap-5", className)}>
      {children}
    </div>
  );
}
