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

Production SmartKidz artwork:

- Launcher / native splash: SmartKidz icon composited on warm `#FFF8F0`
- React animated splash assets (do not regenerate from here): `public/brand/smartkidz-icon.png`, `public/brand/smartkidz-logo.png`

Background color used for generated assets: `#FFF8F0` (warm preschool cream).
