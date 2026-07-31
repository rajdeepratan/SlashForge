# SlashForge brand assets

## SVG

| File | Use |
| --- | --- |
| `svg/slashforge-mark.svg` | Primary mark — avatars, social, anywhere square |
| `svg/slashforge-mark-dark.svg` | Mark for dark backgrounds (`#F3F2F2` ink) |
| `svg/slashforge-mark-mono.svg` | Single-color mark — stamps, embroidery, anywhere color is stripped |
| `svg/slashforge-mark-16-simplified.svg` | Chunkier geometry for 16px use — **use this, not a scaled-down mark** |
| `svg/slashforge-lockup-outlined.svg` | **Mark + wordmark — use this one.** Text outlined, fully self-contained |
| `svg/slashforge-lockup-outlined-dark.svg` | Outlined lockup for dark backgrounds |
| `svg/slashforge-lockup-outlined-mono.svg` | Outlined lockup, single color via `currentColor` |
| `svg/slashforge-lockup.svg` | ⚠️ Legacy — live `<text>` in Archivo. Falls back to Arial where the font is missing. Kept for editing only |
| `svg/slashforge-lockup-dark.svg` | ⚠️ Legacy, same caveat |
| `svg/slashforge-lockup-mono.svg` | ⚠️ Legacy, same caveat |
| `svg/slashforge-favicon-16.svg` | Favicon-sized crop |

**Always prefer the `-outlined` lockups.** The non-outlined ones contain live
`<text>` set in Archivo, so they only render correctly on machines with that
font installed — not GitHub, not most CI, not other people's browsers.

## PNG

| File | Use |
| --- | --- |
| `png/slashforge-mark-16.png` | 16px favicon |
| `png/slashforge-mark-16-simplified.png` | 16px favicon, simplified geometry — better legibility |
| `png/slashforge-mark-32.png` | 32px favicon |
| `png/slashforge-mark-180.png` / `png/apple-touch-icon-180.png` | Apple touch icon |
| `png/slashforge-mark-512.png` | High-res mark |
| `png/slashforge-avatar-512.png` | GitHub organization avatar |
| `png/slashforge-social-1280x640.png` | GitHub social preview (og:image) |

## Color

| Role | Hex |
| --- | --- |
| Ink | `#201E1D` |
| Ember | `#EC3013` |
| Reversed ink (on dark) | `#F3F2F2` |

The mono variants draw ink with `currentColor`, so they inherit from CSS:

```html
<svg style="color:#F3F2F2"> ... </svg>   <!-- reversed -->
```

In a README, GitHub honours light/dark with `<picture>`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/svg/slashforge-lockup-outlined-dark.svg">
  <img src="assets/svg/slashforge-lockup-outlined.svg" alt="SlashForge" height="60">
</picture>
```

## Font

Wordmark: **Archivo**, weight 700, letter-spacing −0.025em.
Open source (SIL OFL): https://fonts.google.com/specimen/Archivo

Only needed to *edit* the wordmark — the `-outlined` lockups have the text
converted to paths and need no font installed.

## Favicon

```html
<link rel="icon" href="/svg/slashforge-favicon-16.svg" type="image/svg+xml">
<link rel="icon" sizes="32x32" href="/png/slashforge-mark-32.png">
<link rel="apple-touch-icon" href="/png/apple-touch-icon-180.png">
```

## Don't

- Don't recolor the ember to anything but `#EC3013`.
- Don't add gradients, outlines, or shadows — the mark is flat by design.
- Don't rotate, skew, or reproportion the slash; the 1:2 angle is the whole mark.
- Don't scale the full mark down to 16px — use the `-16-simplified` variant.
- Keep clear space of at least the ember's width on all sides.

## Not shipped to npm

`assets/` is deliberately outside the `files` allowlist in `package.json`. These
are source and documentation assets; they are not needed at install time.
