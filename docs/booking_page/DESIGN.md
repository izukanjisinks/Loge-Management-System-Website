---
name: Terra Management System
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#54433b'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#87736a'
  outline-variant: '#dac2b7'
  surface-tint: '#924b22'
  primary: '#8a451c'
  on-primary: '#ffffff'
  primary-container: '#a85c32'
  on-primary-container: '#fff3ee'
  inverse-primary: '#ffb691'
  secondary: '#605e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2dd'
  on-secondary-container: '#666460'
  tertiary: '#635546'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d6d5d'
  on-tertiary-container: '#fff2e8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcb'
  primary-fixed-dim: '#ffb691'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#74340c'
  secondary-fixed: '#e6e2dd'
  secondary-fixed-dim: '#c9c6c1'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#484743'
  tertiary-fixed: '#f4dfcb'
  tertiary-fixed-dim: '#d7c3b0'
  on-tertiary-fixed: '#241a0e'
  on-tertiary-fixed-variant: '#524436'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built on a "Rustic Modern" philosophy. It balances the tactile, organic warmth of a hospitality environment with the high-functioning precision of a professional booking tool. The aesthetic goal is to evoke a sense of heritage and groundedness without sacrificing digital efficiency.

The style leverages **Minimalism** with a **Tactile** twist—using a restricted palette of organic tones while ensuring elements have a subtle physical presence through soft shadows and meaningful layering. The interface is designed to feel as reliable as a leather-bound ledger but as fluid as a modern SaaS platform.

## Colors

The palette is centered on earth-toned warmth. The primary **Terracotta (#A85C32)** serves as the high-action color for buttons, selections, and critical states. The background uses a **Cream (#F9F5F0)** base to eliminate the harshness of pure white, providing a softer, more premium reading experience.

**Soft Charcoal (#333333)** is used for primary text to maintain high contrast while avoiding the clinical feel of pure black. A muted **Stone (#D9C5B2)** is utilized for borders and secondary decorative elements to keep the interface feeling light and airy.

## Typography

The design system utilizes **Manrope** for all text levels. Its geometric foundations provide the necessary modern professionalism, while its open apertures and soft curves complement the rustic color palette.

Headlines are set with tighter letter-spacing and heavier weights to create a sense of authority. Body text focuses on legibility with generous line heights. Label styles are consistently bolded to ensure that form fields and data headers are immediately identifiable within complex booking tables.

## Layout & Spacing

The layout follows a **Fixed-Fluid hybrid** model. Primary dashboard views utilize a 12-column fluid grid to maximize data visibility, while modal windows and settings panels are fixed to specific widths to maintain focus.

The spacing rhythm is built on an 8px base unit. Consistent vertical stacks of 16px and 32px are used to group related booking information. Forms use a "tight-cluster" approach where labels are positioned 8px above their respective inputs, with 24px of separation between distinct form groups.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. Instead of traditional high-contrast shadows, this system uses low-opacity, warm-tinted shadows (using the Terracotta or Charcoal base at 5-10% opacity).

- **Level 0 (Base):** Cream background.
- **Level 1 (Cards/Inputs):** White or slightly lighter cream surfaces with a 1px border in Stone.
- **Level 2 (Modals/Popovers):** Elevated with a diffused shadow (20px blur) to create a distinct focus layer above the main dashboard.

## Shapes

The design system uses a **Rounded** shape language to reinforce the approachable, friendly nature of the hospitality industry. Standard components like buttons and input fields utilize a 0.5rem (8px) radius. Larger containers, such as dashboard cards and modals, use a more pronounced 1rem (16px) radius to soften the overall visual footprint.

## Components

### Buttons
Primary buttons are solid Terracotta with white text. Secondary buttons use a Cream background with a Stone border and Charcoal text. Interaction states should involve a subtle darkening of the background color rather than a change in border.

### Input Fields
Inputs are framed with a 1px Stone border. When focused, the border transitions to Terracotta. The internal background of the field should be pure white to provide clear contrast against the Cream page background.

### Segmented Controls (Toggle Buttons)
Used for switching between "Individual" and "Corporate" client types. The selected state uses the solid Terracotta fill, while the unselected state remains Cream with a light border, creating a clear "pressed" vs "unpressed" mental model.

### Data Tables
Tables should have minimal horizontal banding. Use subtle dividers in Stone and ensure the header row is locked with a slightly darker Cream background. 

### Status Chips
Booking statuses (e.g., Confirmed, Pending, Cancelled) use desaturated versions of green, amber, and red, framed in thin borders of the same hue to maintain the "earth-toned" restraint of the system.