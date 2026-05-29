# Invest in Strength — Brand reference

Captured from client-supplied assets (logo, pattern, font, Instagram stories,
campaign keyvisual) on 2026-05-29. Use this to drive the UI/UX sweep.

## Tokens (already wired into the app)
- **Font:** Barlow (`next/font`, weights 400/500/600/700) → Tailwind `font-sans`.
- **Olive / "mudgreen" `#3a4039`** → `brand-600`. Primary actions AND dark surfaces.
- **Paper:** `#f5f5f2` (bg) / `#fafafa` (cream, surfaces + text on dark).
- **Iceblue `#b8d8d6`** → `ice`. Highlights, eyebrow labels, links, translucent
  pills, transparent fades. Also the text-selection highlight.
- **Topo pattern** (`/brand/topo.svg`, grey `#DBDBDB`) → `.topo-surface` (subtle).
- **Mudgreen depth surface** → `.mudgreen-surface` (mudgreen bg + transparent
  dark radial overlay, lighter top-center → darker edges; use white logo + cream
  text). This matches the stories exactly.

## Logo
- Full word/image mark: `/brand/IIS_LOGO_{olive,white,black}.svg` (portrait).
- Emblem (square mark): `/brand/IIS_emblem.svg`; favicon = `src/app/icon.svg`.
- On dark/mudgreen → **white** logo. On light → olive.

## Product vs. marketing (IMPORTANT direction — client, 2026-05-29)
The **platform is LIGHT-led**: a calm, bright "dirty white" background
(`#f5f5f2`/`#fafafa`) throughout. This is an **educational / assessment** tool —
brightness supports reading, focus, and trust; a dark canvas does not fit the
learning vibe. **Mudgreen and darker elements are accents/sections only**
(headers, CTA bands, cards, footers, the certificate, hero accent strips) — NOT
the page background.

The **dark/mudgreen, bold-uppercase look below is the Instagram *campaign*
style** — useful for energy and for accent sections, but it is NOT the product
canvas. Don't darken the whole platform.

## Visual language (observed in the campaign — marketing, not the product canvas)
The campaign is **dark-led**:
- Mudgreen background with depth shading; white emblem centered/top.
- **Headlines:** large, **bold, UPPERCASE** Barlow, cream, tight leading.
- **Eyebrow labels:** uppercase, letter-spaced, iceblue — often inside a
  translucent rounded **pill** (iceblue at low opacity).
- **Body:** regular-weight cream, key words **bold**.
- **CTAs/links:** understated iceblue (e.g. "Mehr erfahren"), small.
- **Cards:** large radius (~16–20px), slightly-lighter-than-bg fill, hairline
  border; used for testimonials (circular avatars + quote + muted attribution,
  thin dividers).
- **Motif:** a subtle down-arrow (↓) as a "more / scroll" cue.
- **Imagery:** editorial, moody, low-key gym photography — desaturated, natural
  light, industrial setting, authentic. Dark and on-mood. (Keyvisual source:
  `A:\WORK\KUNDEN\Invest in Strength\Instagram\...`.)

## Implications for the UI/UX sweep
- **Light-led everywhere** — dirty-white background across admin, candidate, and
  verify. Keep it bright, readable, focused.
- Use mudgreen/dark as **accents and contained sections**, e.g.:
  - a **mudgreen footer** and/or a single **CTA / hero accent band** (here the
    dark-campaign style fits: white logo, bold uppercase headline, keyvisual);
  - **olive** primary buttons, links, active nav, headings;
  - **iceblue** eyebrow pills, highlights, subtle fades;
  - the **certificate** (already olive).
- A keyvisual **hero** can use a photo with a mudgreen/dark overlay as a banded
  section near the top of an otherwise light page — not a full dark page.
- **Admin** stays light + functional; just Barlow + olive/iceblue accents.
- Reusable pieces to build: iceblue **pill/eyebrow**, **uppercase headline**
  style, a **card** style, and a contained **mudgreen band** component.
- Source imagery lives under `A:\WORK\KUNDEN\Invest in Strength\` — copy chosen
  shots into `public/brand/` when wiring a hero band.
