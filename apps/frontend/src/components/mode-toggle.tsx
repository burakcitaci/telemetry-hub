import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 bg-muted dark:bg-slate-800 rounded-lg p-1 border border-input dark:border-slate-700">
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        size="sm"
        onClick={() => setTheme("light")}
        title="Light mode"
        aria-label="Use light theme"
        className={`h-8 w-8 p-0 transition-all ${
          theme === "light"
            ? "bg-white text-foreground shadow-sm hover:bg-gray-100 dark:hover:bg-gray-200"
            : "text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700"
        }`}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        size="sm"
        onClick={() => setTheme("dark")}
        title="Dark mode"
        aria-label="Use dark theme"
        className={`h-8 w-8 p-0 transition-all ${
          theme === "dark"
            ? "bg-slate-800 text-white shadow-sm hover:bg-slate-700"
            : "text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700"
        }`}
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "system" ? "default" : "ghost"}
        size="sm"
        onClick={() => setTheme("system")}
        title={`System preference (${resolvedTheme})`}
        aria-label={`Use system theme, currently ${resolvedTheme}`}
        className={`h-8 w-8 p-0 transition-all ${
          theme === "system"
            ? resolvedTheme === "dark"
              ? "bg-slate-800 text-white shadow-sm hover:bg-slate-700"
              : "bg-white text-foreground shadow-sm hover:bg-gray-100"
            : "text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700"
        }`}
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}
