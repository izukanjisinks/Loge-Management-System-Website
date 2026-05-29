---
name: Mwakwanda Global
colors:
  surface: '#fff8f5'
  surface-dim: '#f2d4c2'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ea'
  surface-container: '#ffeade'
  surface-container-high: '#ffe3d2'
  surface-container-highest: '#fbddca'
  on-surface: '#28180d'
  on-surface-variant: '#53433d'
  inverse-surface: '#3f2c20'
  inverse-on-surface: '#ffede4'
  outline: '#86736b'
  outline-variant: '#d8c2b9'
  surface-tint: '#8d4e2e'
  primary: '#743a1c'
  on-primary: '#ffffff'
  primary-container: '#915131'
  on-primary-container: '#ffd5c3'
  inverse-primary: '#ffb694'
  secondary: '#81542c'
  on-secondary: '#ffffff'
  secondary-container: '#ffc391'
  on-secondary-container: '#7a4e26'
  tertiary: '#60433a'
  on-tertiary: '#ffffff'
  tertiary-container: '#7a5a50'
  on-tertiary-container: '#ffd4c7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb694'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#703719'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#f6bb8a'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#663d17'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#e7bdb1'
  on-tertiary-fixed: '#2c160e'
  on-tertiary-fixed-variant: '#5d4037'
  background: '#fff8f5'
  on-background: '#28180d'
  surface-variant: '#fbddca'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-gap: 48px
---

## Brand & Style

The design system is anchored in the concept of "Refined Hospitality." It balances the precision of a high-end booking engine with the warmth of a boutique lodge. The personality is sophisticated yet approachable, evoking a sense of calm and reliability during the travel planning process.

The visual style is **Modern Organic**. It utilizes a "Corporate Modern" structural foundation—characterized by clear hierarchy and systematic grids—but softens the execution with earthy palettes and tactile surface treatments. The goal is to move away from the cold, blue-toned utility of standard SaaS and toward an editorial, high-trust environment that feels curated and premium.

## Colors

The palette is derived from natural, earthy elements. 
- **Primary (Sienna):** Used for primary actions, active progress states, and brand-critical iconography. 
- **Secondary (Ochre):** Reserved for accent elements, badges, and soft highlights.
- **Surface & Neutrals:** We use a "warm-white" canvas strategy. Instead of pure white (#FFFFFF), the background utilizes a soft cream. Surface layers use a slightly darker beige to create containment without the need for heavy borders.
- **Semantic Colors:** Success (Forest Green), Warning (Amber), and Error (Deep Terracotta) are slightly desaturated to maintain the organic aesthetic.

## Typography

The design system uses **Manrope** exclusively to maintain a modern, geometric, yet highly legible look. 

- **Hierarchy:** We use a strict typographic hierarchy to handle complex forms. Labels use a semi-bold weight with a slight tracking increase for clarity at small sizes.
- **Numbers:** Tabular lining figures should be used for the "Detailed Cost Breakdown" section to ensure price points align perfectly in vertical lists.
- **Contrast:** Headings use the deep neutral (#3D2B1F) while body text uses a slightly lighter tint to reduce visual fatigue during long booking sessions.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for desktop and a **single-column stack** for mobile.

- **Booking Flow:** A two-column split is used for checkout pages (8 columns for form entry, 4 columns for the sticky "Booking Summary").
- **Spacing Rhythm:** An 8px base unit governs all dimensions. Form fields should have a consistent height (56px for primary inputs) with 16px internal padding.
- **Reflow Rules:** On tablet (under 1024px), the sidebar summary moves to the bottom of the viewport as a sticky "Review & Pay" bar or collapses into an accordion at the top of the page.

## Elevation & Depth

To maintain a sophisticated and clean look, we avoid heavy, multi-layered shadows. 

- **Tonal Layering:** Depth is primarily communicated through color. Content cards reside on the canvas (#FCF8F3) and are filled with white (#FFFFFF) or a very subtle beige.
- **Low-Contrast Outlines:** Instead of shadows, use 1px borders in a tone slightly darker than the surface (e.g., #E8DFD5). 
- **Active States:** Only the "Booking Summary" or active "Modal" components should receive a soft, ambient shadow (12% opacity, 20px blur) to indicate they sit highest in the stack.
- **Interactive Depth:** Buttons use a subtle 1px "inset" top border to feel slightly tactile and pressed when active.

## Shapes

The shape language is **Rounded (Level 2)**. This specific radius provides a friendly, welcoming feel without appearing overly "bubbly" or juvenile.

- **Standard Elements:** Buttons, Input Fields, and Chips use a 0.5rem (8px) radius.
- **Large Containers:** Cards and major section wrappers use 1rem (16px) to clearly define the content boundaries.
- **Media:** Images of hotels/rooms should always follow the 1rem radius to match the container language.

## Components

### Buttons
- **Primary:** Solid #915131 with white text. High-contrast, 56px height for main actions.
- **Secondary:** Outlined with a 1.5px stroke of the primary color. Used for "Back" or "Cancel" actions.

### Form Inputs
- **Style:** Filled style using #F2EAE1 background with a bottom-only border that transforms into a full stroke on focus.
- **Labels:** Top-aligned, using `label-md` for maximum legibility during complex data entry.
- **Validation:** Error states use a soft red tint background with a 2px left-border accent.

### Stepper Navigation
- A horizontal line-based stepper. Completed steps show a checkmark in a sienna circle; active steps show a numbered sienna circle; future steps remain in a light beige outline.

### Detailed Cost Breakdown
- Utilizes a list format with horizontal separators. 
- Labels on the left (e.g., "3 Nights x $200"), values on the right. 
- The "Total" line should be emphasized with `headline-md` and a top border of 2px.

### Tabs
- Underline style for secondary navigation. The active tab is indicated by a 3px sienna underline and bolded text, ensuring clear feedback on the current view.