import { AppSidebar } from "./AppSidebar";
import { ThemeFromConfig } from "./ThemeFromConfig";
import { AvisoActualizacion } from "@/components/actualizaciones/AvisoActualizacion";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ThemeFromConfig />
      <AvisoActualizacion />
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
