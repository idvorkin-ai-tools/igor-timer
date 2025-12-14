# Igor Timer

A gym interval timer PWA with stopwatch and set tracking.

**Live App:** https://igor-gym-timer.surge.sh

## Features

- **Interval Timer** - Work/rest rounds with customizable durations
- **Stopwatch** - Simple lap timer
- **Set Tracking** - Log your workout sets
- **PWA** - Install on your phone, works offline
- **Bug Reporting** - Shake to report (mobile) or use Settings

## Screenshots

| Timer | Settings | Bug Report |
|-------|----------|------------|
| ![Timer](screenshot-timer.png) | ![Settings](screenshot-settings.png) | ![Bug Report](screenshot-bug-report.png) |

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Tech Stack

- React 18
- TypeScript
- Vite + vite-plugin-pwa
- [@idvorkin/pwa-utils](https://github.com/idvorkin/pwa-utils) for bug reporting & session recording
