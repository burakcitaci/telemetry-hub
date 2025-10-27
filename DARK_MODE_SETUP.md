# Dark Mode Implementation

This document describes the dark mode setup for the Telemetry Hub frontend application.

## Overview

Dark mode support has been implemented using React Context, Tailwind CSS, and localStorage for persistence. The implementation follows the [shadcn/ui Dark Mode guide for Vite](https://ui.shadcn.com/docs/dark-mode/vite).

## Components Created

### 1. ThemeProvider (`src/components/theme-provider.tsx`)

A React Context provider that manages the theme state:

- **Supports three theme options:**

  - `"light"` - Forces light mode
  - `"dark"` - Forces dark mode
  - `"system"` - Uses system preference (default)

- **Features:**
  - Persists theme preference in localStorage (key: `vite-ui-theme`)
  - Automatically detects system preference using `prefers-color-scheme` media query
  - Applies `light` or `dark` class to document root element
  - Provides `useTheme()` hook for component access

**Usage:**

```typescript
const { theme, setTheme } = useTheme();
setTheme("dark"); // or "light" or "system"
```

### 2. ModeToggle (`src/components/mode-toggle.tsx`)

A UI component with three buttons for switching themes:

- Light mode button (Sun icon)
- Dark mode button (Moon icon)
- System preference button (Monitor icon)

Currently selected theme is highlighted with the "default" button variant.

**Location:** Added to the navigation bar in top-right corner

## Configuration

### Tailwind CSS

The `tailwind.config.js` is already configured for dark mode:

```javascript
darkMode: ["class"],
```

This enables Tailwind's class-based dark mode, where `dark:` prefixes work on elements when the `dark` class is present on the root element.

## Styling Pattern

Dark mode styles are applied using Tailwind's `dark:` prefix:

```jsx
<div className="bg-white dark:bg-slate-950 text-gray-900 dark:text-white">
  Content
</div>
```

Common dark mode mappings used:

- Backgrounds: `bg-white` → `dark:bg-slate-950` or `dark:bg-slate-900`
- Text: `text-gray-900` → `dark:text-white`
- Borders: `border-gray-200` → `dark:border-slate-700`
- Hover states: `hover:bg-gray-50` → `dark:hover:bg-slate-800`

## Updated Files

The following files have been updated with dark mode support:

1. **App.tsx**

   - Wrapped with `ThemeProvider`
   - Added `ModeToggle` to navigation
   - Added dark mode classes to navbar and main container

2. **TracesView.tsx**

   - Dark mode support for header, filters, and table
   - Proper contrast for text and backgrounds
   - Dark mode friendly color scheme for service badges

3. **TraceDetailView.tsx**
   - Dark mode for waterfall visualization
   - Dark mode for details panel
   - Proper styling for all interactive elements

## User Experience

- **First visit:** Uses system preference
- **Theme selection:** User can switch to light or dark mode
- **Persistence:** Selected theme is saved to localStorage
- **Smooth transitions:** No page reload needed when switching themes

## Browser Support

Works on all modern browsers that support:

- `prefers-color-scheme` media query (for system preference detection)
- CSS class selectors
- localStorage API

## Future Enhancements

Potential improvements:

- Add theme preference to user settings/profile
- Add custom color schemes
- Implement transition animations when switching themes
- Add keyboard shortcuts for theme switching
