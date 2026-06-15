"use client";

import { useTheme } from "@/app/context/theme-context";

/**
 * Renders a button that toggles between dark and light themes.
 *
 * The button's `aria-label` indicates the target mode ("Switch to light mode" or "Switch to dark mode")
 * and its content shows a sun icon when the current theme is `"dark"` and a moon icon otherwise.
 *
 * @param className - Optional additional CSS class names appended to the button's default classes
 * @returns The button element that toggles the theme and displays the corresponding icon
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-mono text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 cursor-pointer z-50 ${className}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="text-base leading-none">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
