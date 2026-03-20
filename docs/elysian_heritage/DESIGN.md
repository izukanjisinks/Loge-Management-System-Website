# Design System: The Curated Sanctuary

## 1. Overview & Creative North Star
This design system is built to transform a standard booking transaction into a high-end editorial experience. Our Creative North Star is **"The Digital Concierge"**—a philosophy that prioritizes calm, intentionality, and breathing room over dense information layouts. 

To break the "template" feel common in travel sites, we utilize intentional asymmetry, overlapping elements, and extreme typographic contrast. We do not simply present options; we curate a journey. By leveraging a high-contrast ratio between the elegance of Noto Serif and the functional clarity of Manrope, the interface feels like a luxury travel magazine brought to life.

---

## 2. Colors & Surface Philosophy
The palette is rooted in an architectural neutral base, punctuated by a signature muted gold that evokes craftsmanship and heritage.

### The Palette
*   **Primary (Muted Gold):** `#6f582d` — Used for high-priority CTAs and brand moments.
*   **Surface Hierarchy:**
    *   `surface` (`#f8f9f9`): The foundational canvas.
    *   `surface_container_low` (`#f3f4f4`): Used for secondary sections or background shifts.
    *   `surface_container_lowest` (`#ffffff`): Used for interactive cards to create a natural "pop" against the gray base.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined through background color shifts.
*   *Example:* A "Recommended Properties" section should sit on a `surface_container_low` background, while the individual property cards use `surface_container_lowest`. The contrast is the border.

### The Glass & Gradient Rule
To move beyond a flat UI, utilize **Glassmorphism** for floating navigation and search bars. Use a semi-transparent `surface_container_lowest` (80% opacity) with a `20px` backdrop-blur. 
For primary CTAs, apply a subtle linear gradient from `primary` (`#6f582d`) to `primary_container` (`#8a7143`) at a 135-degree angle. This adds a "silk" sheen that flat hex codes cannot replicate.

---

## 3. Typography
Typography is our primary tool for establishing an authoritative, premium voice.

*   **Display & Headlines (Noto Serif):** These are our "Editorial" voices. Use `display-lg` (3.5rem) for hero statements with tight letter-spacing (-0.02em). These elements can occasionally overlap image boundaries to create depth.
*   **Body & Utility (Manrope):** Our "Functional" voice. All body text (`body-md`) and labels (`label-md`) must use Manrope with increased line-height (1.6) to ensure maximum legibility and a sense of "air."
*   **The Hierarchy Rule:** Never pair two serif styles together. Headlines are always Noto Serif; all supporting metadata, prices, and navigation items are Manrope.

---

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional structural lines.

*   **The Layering Principle:** Stack surfaces to create hierarchy. 
    *   Level 0: `surface` (Main background)
    *   Level 1: `surface_container_low` (Section backgrounds)
    *   Level 2: `surface_container_lowest` (Cards and interactive components)
*   **Ambient Shadows:** When an element must "float" (e.g., a booking modal), use an extra-diffused shadow. 
    *   *Shadow Specs:* `0px 12px 32px rgba(25, 28, 28, 0.06)`. The color is a tinted version of `on_surface`, making the shadow feel like a natural light obstruction rather than a digital effect.
*   **Ghost Borders:** If a boundary is required for accessibility, use the `outline_variant` (`#d0c5b6`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Border radius: `DEFAULT` (4px). Text: `label-md` in `on_primary` (White).
*   **Secondary:** Ghost style. No background, `outline` token at 20% opacity. Text in `primary`.
*   **Interaction:** On hover, primary buttons should subtly scale (1.02x) with a `300ms` ease-out transition.

### Input Fields
*   **Style:** Minimalist. Use `surface_container_lowest` for the field background. No full border—only a bottom stroke using `outline_variant` at 40%.
*   **States:** On focus, the bottom stroke transforms into the `primary` (Gold) color.

### Cards & Lists
*   **Constraint:** **Forbid the use of divider lines.** 
*   **Spacing:** Separate property listings using the `spacing-12` (4rem) or `spacing-16` (5.5rem) tokens. 
*   **Imagery:** All images within cards must have a `lg` (8px) border radius. Use a subtle `inner-glow` on images to keep them from feeling "cut out" of the layout.

### Date Pickers & Modals
*   Apply the **Glassmorphism** rule here. These are "floating" utilities and should allow the high-quality hotel imagery to bleed through the background via backdrop-blur.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins. For example, a heading might be offset to the left while the body text is tucked 100px further in.
*   **Do** use high-quality, desaturated imagery that matches the neutral tone of the design system.
*   **Do** favor vertical white space. If a section feels "done," add another `spacing-10` of padding.

### Don't
*   **Don't** use standard "Select" dropdowns. Design custom, tonal overlays that match the surface hierarchy.
*   **Don't** use pure black (`#000000`) for text. Always use `on_surface` (`#191c1c`) to maintain a soft, premium contrast.
*   **Don't** use sharp corners (0px) or heavy "pill" shapes (999px). Stick strictly to the `DEFAULT` (4px) and `lg` (8px) scale to maintain a "bespoke stationery" feel.
*   **Don't** use bright, saturated red for errors. Use the `error` token (`#ba1a1a`) which is slightly muted to fit the luxury context.

---

## 7. Motion & Interaction
Motion is the "vibe" of luxury. 
*   **Entry:** Elements should enter using a "Slide & Fade"—a subtle `20px` upward shift combined with a fade-in over `600ms`.
*   **Hover:** Images should have a very slow scale-up (1.05x) over `1200ms` when hovered, mimicking the slow-motion feel of a luxury brand film.