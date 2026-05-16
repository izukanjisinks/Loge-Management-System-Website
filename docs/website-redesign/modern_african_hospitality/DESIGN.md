---
name: Modern African Hospitality
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#53443d'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#85736c'
  outline-variant: '#d8c2b9'
  surface-tint: '#8a4f32'
  primary: '#874d30'
  on-primary: '#ffffff'
  primary-container: '#a46546'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb693'
  secondary: '#74584a'
  on-secondary: '#ffffff'
  secondary-container: '#fed8c5'
  on-secondary-container: '#795d4e'
  tertiary: '#68594a'
  on-tertiary: '#ffffff'
  tertiary-container: '#827261'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#6d381d'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#e3bfad'
  on-secondary-fixed: '#2a170c'
  on-secondary-fixed-variant: '#5a4134'
  tertiary-fixed: '#f4dfcb'
  tertiary-fixed-dim: '#d7c3b0'
  on-tertiary-fixed: '#241a0e'
  on-tertiary-fixed-variant: '#524436'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
  clay-earth: '#A3644D'
  savannah-mist: '#F3EBE3'
  deep-obsidian: '#1F1A17'
typography:
  display-lg:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
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
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
This design system embodies the concept of "Modern African Hospitality"—a fusion of high-end professional service with the grounded, organic warmth of the continent’s landscape. The visual identity avoids the clichés of tourism, instead leaning into a sophisticated, minimalist aesthetic that prioritizes clarity and tactile elegance.

The target audience consists of discerning travelers seeking authenticity and luxury. The UI should evoke a sense of calm, reliability, and arrival. By blending heavy whitespace with a rich, earthy color palette, the system creates an environment that feels both expansive and intimate. The style is fundamentally **Corporate Modern** with **Tactile** accents, utilizing subtle tonal shifts rather than aggressive borders or shadows to define space.

## Colors
The color palette is inspired by natural earth minerals and sun-drenched landscapes. The primary color is a refined terracotta, used for key actions and focal points to provide warmth without visual fatigue. The secondary color is a deep, espresso brown, providing the necessary professional weight and high-contrast legibility for structural elements.

The background uses a "Savannah Mist" off-white rather than pure white to reduce eye strain and reinforce the organic theme. Semantic colors (success, error, warning) should be slightly desaturated to remain harmonious with the earthy core palette, ensuring that even utilitarian messages feel integrated into the brand experience.

## Typography
The typography strategy creates a dialogue between tradition and modernity. Headings utilize **Literata**, a sophisticated serif that offers a literary, high-end feel, suggesting the storytelling aspect of travel. It is used sparingly for titles and featured quotes to maintain an editorial quality.

For UI elements, navigation, and long-form body text, **Hanken Grotesk** provides a clean, contemporary contrast. Its geometric clarity ensures high readability on functional screens like lodge booking engines and search results. Label styles should frequently use increased letter spacing and uppercase styling to provide a modern, organized structure to the information architecture.

## Layout & Spacing
This design system follows a strict 12-column fixed grid for desktop to ensure content remains centered and readable, mimicking the structured layout of high-authority informational sites. On mobile, the grid collapses to a single column with generous 20px side margins.

Spacing is governed by an 8px base unit, promoting a rhythmic "breathable" layout. Information density should be kept moderate to low; whitespace is not considered "empty" but a functional tool to denote luxury and ease of use. Vertical stacks should favor larger gaps (32px+) between distinct sections to allow the user to focus on one task at a time.

## Elevation & Depth
Depth is conveyed primarily through tonal layering and extremely subtle ambient shadows. Surfaces should feel integrated rather than floating. 

1.  **Level 0 (Canvas):** The base Savannah Mist background.
2.  **Level 1 (Cards/Containers):** Pure white or slightly lighter cream surfaces with a 1px "Savannah-Mist" border or a very soft, clay-tinted shadow (Opacity: 4%, Blur: 12px).
3.  **Level 2 (Interaction/Popovers):** Elements that require immediate focus use a more defined shadow with a slight vertical offset to suggest physical lifting from the canvas.

Avoid harsh black shadows or heavy outlines. The goal is to simulate soft, natural light hitting a flat, textured surface.

## Shapes
The shape language is "Rounded," striking a balance between the rigid professionalism of a booking platform and the soft, organic forms found in African architecture and nature. 

Standard components like input fields and buttons utilize a 0.5rem (8px) radius. Larger containers, such as property cards or modal windows, should lean into the `rounded-lg` (1rem) or `rounded-xl` (1.5rem) categories to feel more inviting. Interactive elements like tags or category chips should use pill-shaping to distinguish them from primary action buttons.

## Components
- **Buttons:** Primary buttons are filled with the terracotta color using white text. Secondary buttons use the terracotta as a border color with a cream background. For high-end luxury feel, use Hanken Grotesk in Medium weight with 0.05em letter spacing.
- **Input Fields:** Soft cream background (#F3EBE3) with a subtle 1px border. On focus, the border transitions to the primary terracotta color with a 2px outer glow.
- **Cards:** Property cards should feature full-bleed imagery at the top. The content area below uses Literata for the property name and Hanken Grotesk for the price and location details.
- **Chips/Tags:** Used for lodge amenities. They should have a neutral clay-tinted background (#D9C5B2) with dark espresso text to ensure they are readable but not distracting from the main CTA.
- **Checkboxes/Radios:** Rounded corner squares for checkboxes, circles for radios. Both use the primary terracotta color for the active state to maintain warmth in the utility icons.
- **Navigation:** The top navigation should be clean with generous spacing between items, utilizing the label-md typography style for a professional, organized appearance.