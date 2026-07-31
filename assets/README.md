# SlashForge brand assets

## Files
| File | Use |
| --- | --- |
| `slashforge-mark.svg` | Primary mark — GitHub org avatar, npm, social |
| `slashforge-mark-mono.svg` | Single-color mark — stamps, embroidery, anywhere color is stripped |
| `slashforge-lockup.svg` | Mark + wordmark — README header, docs site |
| `slashforge-lockup-mono.svg` | Single-color lockup |
| `slashforge-favicon-16.svg` | Favicon-sized crop (same geometry, 16px box) |

## Color
| Role | Hex |
| --- | --- |
| Ink | `#201E1D` |
| Ember | `#EC3013` |
| Reversed ink (on dark) | `#F3F2F2` |

Ink is drawn with `currentColor`. To flip for dark backgrounds, set `color`:

```html
<img src="slashforge-mark.svg" alt="SlashForge">          <!-- inline <svg> preferred -->
<svg style="color:#F3F2F2"> ... </svg>                     <!-- reversed -->
```

In a README, GitHub honours light/dark with two images:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="svg/slashforge-lockup-dark.svg">
  <img src="svg/slashforge-lockup.svg" alt="SlashForge" height="48">
</picture>
```

(For that you need a dark variant: copy the lockup and set `color="#F3F2F2"` on the root `<svg>`.)

## Font
Wordmark: **Archivo**, weight 700, letter-spacing −0.025em.
Open source (SIL OFL), on Google Fonts: https://fonts.google.com/specimen/Archivo

The lockup SVGs use live `<text>`, so they only render correctly where Archivo is
installed. Before shipping, outline the text (Figma/Illustrator "Outline stroke" or
`inkscape --export-text-to-path`) — after that the SVG is self-contained.

## Favicon
The SVG works directly in modern browsers:

```html
<link rel="icon" href="/svg/slashforge-favicon-16.svg" type="image/svg+xml">
```

For Safari/legacy, also export PNGs at 16, 32, 180 (apple-touch) and 512 from
`slashforge-mark.svg`.

## Don't
- Don't recolor the ember to anything but `#EC3013`.
- Don't add gradients, outlines, or shadows — the mark is flat by design.
- Don't rotate, skew, or reproportion the slash; the 1:2 angle is the whole mark.
- Keep clear space of at least the ember's width on all sides.
