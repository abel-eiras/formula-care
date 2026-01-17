import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "ml-64 md:ml-64", // Matches sidebar width
        "p-6 md:p-8"
      )}>
        {children}
      </main>
    </div>
  );
}
