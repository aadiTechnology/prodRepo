# Capacitor asset sources

Place source images here, then run:

```bash
npm run cap:assets
```

## Required files

| File | Recommended size | Purpose |
|------|------------------|---------|
| `icon.png` | 1024×1024 px | App launcher icon (square, no transparency required) |
| `icon-foreground.png` | 1024×1024 px | Adaptive icon foreground (Android) |
| `splash.png` | 2732×2732 px | Splash screen (logo centered on solid background) |

Current placeholders are copies of `public/aadi-logo.png`. Replace them with production artwork before store release.

Background color used for generated assets: `#1976d2` (MUI primary blue).
