import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Browser detection utility
const isEdge = () => {
  return navigator.userAgent.includes('Edg/');
};

const isChrome = () => {
  return navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg/');
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, _setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
    () => {
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return theme;
    }
  );

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = (newTheme: "dark" | "light") => {
      // Edge sometimes has issues with classList manipulation
      if (isEdge()) {
        // Force reflow for Edge to ensure proper rendering
        root.style.display = 'none';
        root.offsetHeight; // Trigger reflow
        root.style.display = '';
      }
      
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);

      // Additional fallback for CSS variable support
      if (isEdge()) {
        // Edge may need explicit style setting for some variables
        document.body.style.color = newTheme === 'dark' ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)';
        document.body.style.backgroundColor = newTheme === 'dark' ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)';
        
        // Remove inline styles after a short delay to allow CSS to take over
        setTimeout(() => {
          document.body.style.color = '';
          document.body.style.backgroundColor = '';
        }, 50);
      }
    };

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        updateTheme(e.matches ? "dark" : "light");
      }
    };

    // Set initial theme
    if (theme === "system") {
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      updateTheme(systemTheme);
    } else {
      updateTheme(theme);
    }

    // Listen for system theme changes
    // Edge may have different event listener behavior
    if (isEdge()) {
      // Use a more robust approach for Edge
      const edgeHandler = (e: MediaQueryListEvent) => {
        requestAnimationFrame(() => {
          handleSystemThemeChange(e);
        });
      };
      mediaQuery.addEventListener("change", edgeHandler);
      
      return () => {
        mediaQuery.removeEventListener("change", edgeHandler);
      };
    } else {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      };
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    _setTheme(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
