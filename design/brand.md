# PRETAG AMIS - brand

The visual identity comes from the PRETAG Ashanti logo
(`pretag-logo-original.jpg` / `pretag-emblem.jpg`).

## Colour

| Token | Light | Dark | From the logo | Use |
|---|---|---|---|---|
| `--pretag-red` / `--primary` | `#C4161C` | `#F0574E` | the ring | header bar, primary buttons, links, section rules, active nav |
| `--pretag-red-bright` | `#E11B1B` | `#F4655B` | the ring (exact) | focus rings, small accents |
| `--surface` (cards, bars) | `#F6E9C0` | `#211A14` | the logo's gold field, deepened | every card, the sidebar, the top bar, table bodies, the login card |
| `--ground` (page behind cards) | `#E8D8A6` | `#17120E` | the field, deeper still | app background, form inputs (recessed look) |
| `--surface-2` (washes) | `#EFE0B2` | `#2B2015` | between surface and ground | table zebra, hover, inactive tabs |
| `--pretag-gold` | `#B07A12` | `#E0A63E` | the hawk's plumage | secondary accent, chart series, `stat` top rule alt |
| `--pretag-olive` | `#5E6B18` | `#9EAB4C` | the pen shaft | tertiary accent |
| `--pretag-black` / `--ink` | `#1C1712` | `#F4ECD9` | the heading text | body text |

### Data semantics (build-plan section 27 / section 60)

| State | Token | Light | Anchor |
|---|---|---|---|
| Growing | `--grow` | `#4E7A1C` | olive-green, echoes the pen |
| Stable | `--stable` | `#A8791A` | goldenrod, echoes the plumage |
| Declining | `--decline` | `#A82318` | deep brick, darker/browner than `--primary` |

`--decline` and `--primary` are both red. **Status colour must always be paired
with an icon and a text label**; `--primary` is reserved for chrome and actions,
never for "this number is bad".

## Type

- **Display** - `Archivo` 700-800, UPPERCASE, tight leading. Echoes the heavy
  condensed grotesque of the logo wordmark. Headings only.
- **Body** - `Source Serif 4`. A serif sets the "official association record"
  tone appropriate for REC/NEC reporting.
- **Mono** - `IBM Plex Mono`. Employee numbers, district codes, table data,
  eyebrow labels, timestamps.

## Logo usage

- App header: the circular emblem at 40-56px, left of the wordmark.
- Login screen: the full logo (with wordmark) centred, max 320px wide.
- Favicon / PWA icon: the emblem, cropped square.
- Never recolour the emblem or place it on a mid-tone background - it carries its
  own pale-yellow field. On dark surfaces, sit it on a white rounded chip.

## Files

- `tokens.css` - drop in at the app root; the single source of colour + type tokens.
- `pretag-logo-original.jpg` - full logo with wordmark (1501x1600).
- `pretag-emblem.jpg` - cropped circular emblem (512px).
