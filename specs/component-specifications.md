# Component Specifications

## Status Indicator Component

### Design
```
┌─────────────────────────────┐
│    🟢 Ready to speak        │  <- Centered, prominent
└─────────────────────────────┘
```

### States
1. **Ready**: Green dot + "Ready to speak"
2. **Speaking**: Blue animated pulse + "Speaking..."
3. **Paused**: Orange dot + "Paused"

### Specifications
- Height: 48px
- Background: --bg-secondary
- Font: --text-lg, --font-medium
- Icon size: 12px
- Animation: Pulse effect when speaking

## Primary Action Button

### Design
```
┌─────────────────────────────┐
│        ▶️  Speak             │  <- Large, centered
└─────────────────────────────┘
```

### States
1. **Ready**: "▶️ Speak" (blue)
2. **Speaking**: "⏸️ Pause" (blue)
3. **Paused**: "▶️ Resume" (orange)

### Specifications
- Height: 44px
- Width: Full width - 32px margin
- Background: --primary-blue
- Font: --text-base, --font-semibold
- Border radius: --radius-md
- Shadow: --shadow-md

## Voice Selector

### Design
```
Voice:
┌─────────────────────────────┐
│ Samantha              ▼     │
└─────────────────────────────┘
```

### Specifications
- Height: 36px
- Label above dropdown
- Full width
- Border: 1px solid --neutral-300
- Focus: --primary-blue outline

## Speed Control (Preset Buttons)

### Design
```
Speed:
┌─────┬─────┬─────┬─────┬─────┐
│0.75x│ 1x  │1.25x│1.5x │ 2x  │
└─────┴─────┴─────┴─────┴─────┘
```

### Specifications
- Button height: 32px
- Equal width distribution
- Active state: --primary-blue background, white text
- Inactive: --neutral-100 background
- Border radius: --radius-sm
- No gaps between buttons (connected group)

## Volume Control (Preset Buttons + Mute)

### Design
```
Volume:
┌───┬─────────┬─────────┬─────────┐
│🔇 │  Quiet  │ Normal  │  Loud   │
└───┴─────────┴─────────┴─────────┘
```

### Specifications
- Mute toggle: 36px square
- Preset buttons: Match speed control style
- Quiet: 50%, Normal: 75%, Loud: 100%
- Mute icon changes based on state

## Settings Button

### Design
```
┌─────────────────────────────┐
│ ⚙️ Advanced Settings         │
└─────────────────────────────┘
```

### Specifications
- Height: 32px
- Secondary style: Border only
- Position: Bottom of popup
- Opens advanced panel/page

## Compact Layout Structure

```
┌─────────────────────────────────┐
│  Status: 🟢 Ready to speak      │ 48px
├─────────────────────────────────┤
│                                 │ 16px spacing
│  ┌─────────────────────────┐   │
│  │      ▶️ Speak            │   │ 44px
│  └─────────────────────────┘   │
│                                 │ 20px spacing
│  Voice:                         │
│  ┌─────────────────────────┐   │ 36px
│  │ Samantha            ▼   │   │
│  └─────────────────────────┘   │
│                                 │ 16px spacing
│  Speed:                         │
│  ┌───┬───┬───┬───┬───┐        │ 32px
│  │.75│1x │1.2│1.5│2x │        │
│  └───┴───┴───┴───┴───┘        │
│                                 │ 16px spacing
│  Volume:                        │
│  ┌─┬─────┬─────┬─────┐        │ 32px
│  │🔇│Quiet│Norm │Loud │        │
│  └─┴─────┴─────┴─────┘        │
│                                 │ 20px spacing
│  ┌─────────────────────────┐   │
│  │ ⚙️ Advanced Settings     │   │ 32px
│  └─────────────────────────┘   │
└─────────────────────────────────┘

Total Height: ~312px (no scrolling needed)
```

## Advanced Settings Panel

### Hidden Features (Accessible via Settings)
1. Force Stop button
2. Domain-specific settings
3. Keyboard shortcuts reference
4. Test area for voice preview
5. Reading time estimation toggle

### Design Pattern
- Slide-in panel or separate page
- Back button to main view
- Grouped by functionality
- Clear descriptions for each option

## Micro-interactions

### Button Press
- Scale: 0.98
- Duration: 150ms
- Background color darkens

### Status Change
- Fade transition: 200ms
- Icon rotation for state changes

### Speaking Animation
- Pulse effect on status indicator
- 2s duration, ease-in-out
- Subtle scale: 1.0 to 1.1

## Error States

### No Text Selected
- Status: "Select text to speak"
- Primary button: Disabled state
- Helpful tooltip on hover

### TTS Error
- Status: Red "Error: [message]"
- Retry button appears
- Clear error description

## Responsive Behavior

### Text Truncation
- Voice names: Ellipsis after 20 characters
- Status messages: Wrap to 2 lines max

### Dynamic Sizing
- Buttons expand to fill available width
- Maintain minimum touch targets (44px)