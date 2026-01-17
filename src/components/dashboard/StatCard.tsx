import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary";
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default" 
}: StatCardProps) {
  return (
    <div className={cn(
      "stat-card group cursor-pointer",
      variant === "primary" && "border-l-4 border-l-primary",
      variant === "secondary" && "border-l-4 border-l-secondary"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
              trend.isPositive 
                ? "bg-success-soft text-success" 
                : "bg-destructive-soft text-destructive"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-colors duration-200",
          variant === "primary" 
            ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" 
            : variant === "secondary"
            ? "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
