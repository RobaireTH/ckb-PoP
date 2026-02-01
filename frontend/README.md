# CKB-PoP

Proof of Participation protocol for the Nervos blockchain. Issue and collect soulbound attendance badges for real-world and virtual events.

## Overview

CKB-PoP enables event organizers to create events and issue cryptographic proof-of-attendance badges (SBTs) to participants. Attendees scan QR codes to check in via ```pop-kiosk``` and mint non-transferable badges to their CKB wallets.

## Tech Stack

- **Framework**: Angular (standalone components, signals-based state)
- **Language**: TypeScript 
- **Styling**: Tailwind CSS
- **Build**: Angular CLI with Vite
- **Target Chain**: Nervos CKB Layer 1

## Features

- **Event Creation** - Organizers deploy events with metadata (name, date, location, description)
- **Dynamic QR Codes** - Time-limited codes (60s validity) prevent replay attacks, may be updated.
- **Badge Minting** - Soulbound tokens (non-transferable) issued on CKB
- **Multi-Wallet Support** - JoyID, WalletConnect, UniPass, Neuron, MetaMask
- **Badge Gallery** - View and manage collected attendance proofs
- **Live QR Display** - Real-time rotating QR for event screens

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
│   │   └── wallet-modal/      # Wallet connection UI
│   └── services/
│       ├── poap.service.ts    # Event and badge logic
│       └── wallet.service.ts  # Wallet connection state
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

## Architecture Notes

- **Standalone Components**: All components use Angular's standalone API
- **Signals**: State management via Angular signals (`signal`, `computed`)
- **Services**: Injectable services with `providedIn: 'root'`
- **Reactive**: RxJS for async operations where needed

## Current Status

Frontend MVP with simulated blockchain interactions. Backend CKB integration pending.
