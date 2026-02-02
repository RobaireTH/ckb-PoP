# CKB-PoP

Proof of Participation protocol for the Nervos blockchain. Issue and collect soulbound attendance badges for real-world and virtual events.

## Overview

CKB-PoP enables event organizers to create events and issue cryptographic proof-of-attendance badges (SBTs) to participants. Attendees scan QR codes to check in via ```pop-kiosk``` and mint non-transferable badges to their CKB wallets.

## Tech Stack

- **Framework**: Angular 21 (standalone components, signals-based state)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS
- **Build**: Angular CLI with Vite
- **Target Chain**: Nervos CKB Layer 1

## Features

- **Event Creation** - Organizers deploy events with metadata (name, date, location, description)
- **Dynamic QR Codes** - Time-limited codes (60s validity) prevent replay attacks
- **Badge Minting** - Soulbound tokens (non-transferable) issued on CKB
- **Multi-Wallet Support** - JoyID, WalletConnect, UniPass, Neuron, MetaMask
- **Badge Gallery** - View and manage collected attendance proofs with filtering and sorting
- **Live QR Display** - Real-time rotating QR for event screens

### Mobile Experience

- **Bottom Navigation** - Thumb-friendly navigation bar on mobile devices
- **Touch Targets** - 44px minimum touch targets for accessibility
- **Responsive Header** - Adapts gracefully to screens as small as 360px

### Reliability

- **Offline Detection** - Persistent banner when connection is lost, toast on reconnection
- **Error Boundaries** - Graceful error handling with retry options
- **Form Validation** - Inline error messages with real-time feedback

### Accessibility

- **ARIA Labels** - Proper labels for screen readers
- **Keyboard Navigation** - Skip links, focus management, visible focus indicators
- **Screen Reader Support** - Live regions for dynamic content announcements

## Project Structure

```
frontend/
├── src/
│   ├── app.component.ts       # Root component
│   ├── app.routes.ts          # Route definitions
│   ├── components/
│   │   ├── landing/           # Home page
│   │   ├── check-in/          # QR code scanner
│   │   ├── minting/           # Badge minting flow
│   │   ├── gallery/           # User's badge collection
│   │   ├── create-event/      # Event creation form
│   │   ├── live-qr/           # Dynamic QR display
│   │   ├── header/            # Navigation header
│   │   ├── bottom-nav/        # Mobile bottom navigation
│   │   ├── wallet-modal/      # Wallet connection UI
│   │   ├── toast/             # Notification toasts
│   │   ├── offline-banner/    # Offline status indicator
│   │   ├── error-boundary/    # Error fallback UI
│   │   └── async-boundary/    # Loading/error states
│   └── services/
│       ├── poap.service.ts    # Event and badge logic
│       ├── wallet.service.ts  # Wallet connection state
│       ├── toast.service.ts   # Toast notifications
│       ├── offline.service.ts # Network status detection
│       └── error-handler.service.ts # Global error handling
├── angular.json
├── package.json
└── tsconfig.json
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Home page |
| `/check-in` | CheckIn | Scan event QR code |
| `/minting` | Minting | Confirm and mint badge |
| `/gallery` | Gallery | View collected badges |
| `/create` | CreateEvent | Deploy new event |
| `/event/:id/live` | LiveQr | Display rotating QR |

## Prerequisites

- Node.js 20+
- npm 10+

## Development

```bash
# Install dependencies
cd frontend
npm install

# Start dev server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Testing

Use event code `demo` to test the check-in flow without creating an event.

## Architecture Notes

- **Standalone Components**: All components use Angular's standalone API
- **Signals**: State management via Angular signals (`signal`, `computed`)
- **Services**: Injectable services with `providedIn: 'root'`
- **Reactive**: RxJS for async operations where needed
- **Zoneless**: Uses `provideZonelessChangeDetection()` for better performance

## Current Status

Frontend MVP with simulated blockchain interactions. Backend CKB integration pending.
