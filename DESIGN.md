# Ferdant design direction

Read this before changing the interface. It replaces the November 10 location-first direction, which stays in Git under `guides-site-20261110`.

## November 25: the holding company site

The site is the public face of an industrial holding company and its hiring pages. It keeps the Ferdant manner and borrows one idea: a photographic hero.

### Hero

Every page opens with a photograph of the Sierra Nevada, the Sacramento Valley or a northern Sierra powerhouse, shown in greyscale under a pine-green tint. The wordmark and navigation sit in white over it, then the page title in large white Newsreader and a short Newsreader statement beneath. The home hero fills most of the first screen; inner pages are shorter. The only motion is a short fade of the hero text, removed under reduced motion.

### Type and colour

The wordmark is lowercase `ferdant.` in Newsreader: white over the hero, ink with a pine dot on paper. Newsreader regular sets titles, section headings and role names. Geist sets navigation and reading text. Both are self-hosted with their SIL Open Font License notices; no external font request.

| Role | Value |
| --- | --- |
| Paper | `#FBFCFA` |
| Ink | `#14202B` |
| Muted ink | `#5D666C` |
| Hairline | Ink at 14% opacity |
| Accent (links, button, tint) | Pine `#1F4A33` |

Pine is the only accent. Below the hero: paper ground, space and hairlines, square or 2px corners, underlined text links with an arrow. No card grids, pills, shadows or gradients. One filled button per screen, the Apply button on role pages.

### Sections

On wide screens a section's heading sits in the left column and its text in the right, with a hairline between sections. On phones they stack. Lists are rows divided by hairlines. The careers page lists each role as a row linking to its page.

### California

The home page's "Where we are" and the Contact page show a static California outline with faint county lines and one pine dot for Davis. It is drawn from U.S. Census TIGERweb county boundaries (public domain) and has no interaction.

### Checks

Every page must read well from 360 to 430px and 1280 to 1680px wide with no sideways scrolling, keep tap targets at least 44px, and keep text contrast at least 4.5:1. `scripts/check-site.py` covers pages, head tags, links, apply subjects and banned words; screenshots at 390×844 and 1440×900 cover the rest.
