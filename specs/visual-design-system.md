# Visual Design System Specification

## Color Palette

### Primary Colors
```css
--primary-blue: #1976D2;      /* Main action color */
--primary-hover: #1565C0;     /* Hover state */
--primary-active: #0D47A1;    /* Active/pressed state */
```

### Status Colors
```css
--status-ready: #4CAF50;      /* Ready state */
--status-speaking: #2196F3;   /* Speaking state */
--status-paused: #FF9800;     /* Paused state */
--status-error: #F44336;      /* Error state */
```

### Neutral Colors
```css
--neutral-900: #212121;       /* Primary text */
--neutral-700: #616161;       /* Secondary text */
--neutral-500: #9E9E9E;       /* Disabled text */
--neutral-300: #E0E0E0;       /* Borders */
--neutral-100: #F5F5F5;       /* Backgrounds */
--neutral-000: #FFFFFF;       /* White */
```

### Background Colors
```css
--bg-primary: #FFFFFF;        /* Main background */
--bg-secondary: #FAFAFA;      /* Secondary sections */
--bg-hover: #F5F5F5;          /* Hover states */
```

## Typography

### Font Family
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes
```css
--text-xs: 11px;              /* Helper text */
--text-sm: 12px;              /* Secondary text */
--text-base: 14px;            /* Body text */
--text-lg: 16px;              /* Headings */
--text-xl: 18px;              /* Primary status */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

## Spacing System

### Base Unit: 4px
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

### Component Spacing
- Popup padding: 16px (--space-4)
- Section spacing: 20px (--space-5)
- Control spacing: 12px (--space-3)
- Button padding: 8px 16px (--space-2 --space-4)

## Border Radius
```css
--radius-sm: 4px;             /* Small elements */
--radius-md: 6px;             /* Buttons, inputs */
--radius-lg: 8px;             /* Cards, containers */
--radius-full: 9999px;        /* Pills, toggles */
```

## Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
```

## Interactive States

### Hover
- Buttons: Darken background by 10%
- Add subtle shadow: --shadow-sm
- Cursor: pointer

### Active
- Buttons: Darken background by 20%
- Scale: 0.98
- Remove shadow

### Focus
- Outline: 2px solid --primary-blue
- Outline offset: 2px
- No default browser outline

### Disabled
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects

## Animation

### Transitions
```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Standard Properties
- Background color changes: --transition-fast
- Transform/scale: --transition-base
- Opacity: --transition-base

## Layout Constraints

### Popup Dimensions
- Width: 320px (fixed)
- Min height: Auto
- Max height: 400px (no scroll needed)

### Component Dimensions
- Button height: 36px (standard), 44px (primary)
- Input height: 36px
- Dropdown height: 36px
- Icon size: 20px

## Accessibility

### Color Contrast
- Normal text on background: 7:1 minimum
- Large text on background: 4.5:1 minimum
- Interactive elements: 3:1 minimum

### Focus Indicators
- Always visible on keyboard navigation
- High contrast (meets WCAG AA)
- Never rely on color alone

### Motion
- Respect prefers-reduced-motion
- Provide alternative feedback for animations