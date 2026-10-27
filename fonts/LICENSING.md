# Fonts

| File | Family | Foundry | License | Status |
|---|---|---|---|---|
| inter-latin-wght-normal.woff2, inter-latin-wght-italic.woff2 | Inter | Rasmus Andersson | SIL OFL 1.1 | shipped |
| roboto-slab-latin-wght-normal.woff2 | Roboto Slab | Google (Christian Robertson) | Apache 2.0 | shipped — served stand-in for Lexia |
| — | Lexia | Dalton Maag | proprietary | NOT shipped: license required before using the real oneAZ display face |

The oneAZ token string keeps `Lexia` first (`Lexia, "Roboto Slab", Georgia, serif`), so adding a licensed Lexia
woff2 + `@font-face` in `styles/fonts.css` switches every heading to it with no other change.
