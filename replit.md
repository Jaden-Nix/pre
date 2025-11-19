# Predora - AI-Powered Prediction Market Platform

## Project Overview
Predora is a next-generation prediction market platform built on BNB Chain, featuring AI-powered market creation, resolution, and a TikTok-style Quick Play interface.

## Architecture

### Frontend (Next.js + React)
- **Location**: `/client` directory
- **Framework**: Next.js 15 with App Router
- **Key Technologies**:
  - TypeScript for type safety
  - Tailwind CSS for styling
  - Framer Motion for animations
  - RainbowKit + wagmi for Web3 wallet connection
  - Firebase client SDK for real-time data
  - Chart.js for data visualization

### Backend (Express.js)
- **Location**: `/server` directory
- **Framework**: Express.js with ES modules
- **Key Features**:
  - AI proxy endpoint for Gemini API calls
  - Firebase Admin SDK for database operations
  - Oracle system for automatic market resolution
  - Secure API endpoints with CRON protection

## Project Structure

```
├── client/                    # Next.js frontend application
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── app/             # Main application
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── providers.tsx    # Web3 & React Query providers
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── QuickPlay.tsx   # TikTok-style swipe interface
│   │   ├── MarketsList.tsx # Market discovery
│   │   ├── MarketCard.tsx  # Individual market display
│   │   ├── UserProfile.tsx # User dashboard
│   │   └── ...             # Other UI components
│   ├── lib/                 # Configurations
│   │   ├── wagmi.ts        # Web3 config (BNB Chain)
│   │   └── firebase.ts     # Firebase client config
│   ├── types/              # TypeScript definitions
│   └── hooks/              # Custom React hooks
│
├── server/                  # Express.js backend
│   ├── index.js            # Main server file
│   ├── package.json        # Backend dependencies
│   └── public/             # Static HTML files (legacy)
│
└── replit.md               # This file
```

## Key Features Implemented

### Phase 1 - Core Refactoring (Current)
✅ Next.js setup with TypeScript and Tailwind
✅ Web3 wallet integration with RainbowKit
✅ Firebase client configuration
✅ Responsive navigation system
✅ Landing page with animations
✅ Quick Play swipe interface
✅ Markets listing and filtering
✅ User profile dashboard
✅ Create market interface

### Planned Features (From Feature List)
- AI-powered market creation with Gemini
- Two market types (No-Loss Fixed Pot + Traditional AMM)
- AI Judge resolution engine
- Social features (XP, levels, leaderboards)
- Multi-chain support
- Advanced trading features

## Running the Project

### Development Mode
- **Frontend**: Runs on port 5000
  - Command: `cd client && npm run dev`
  - URL: `http://localhost:5000`

- **Backend**: Runs on port 3001
  - Command: `cd server && npm start`
  - URL: `http://localhost:3001`

### Environment Variables Required

#### Frontend (.env.local in /client)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_FIREBASE_*` - Firebase client config
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect ID

#### Backend (Replit Secrets)
- `GEMINI_API_KEY` - Google Gemini AI API key
- `CRON_SECRET` - Secret for Oracle job endpoint
- `GOOGLE_APPLICATION_CREDENTIALS` - Firebase Admin JSON

## Recent Changes (Nov 19, 2025)
- Migrated from vanilla HTML to Next.js framework
- Set up full TypeScript project structure
- Implemented Web3 integration with wagmi and RainbowKit
- Created component-based architecture for scalability
- Separated frontend and backend into different directories
- Added Framer Motion for smooth animations
- Configured BNB Chain support (Testnet + Mainnet)

## Technology Stack

### Frontend
- Next.js 15 (React 19)
- TypeScript
- Tailwind CSS
- Framer Motion
- wagmi + viem (Web3)
- RainbowKit (Wallet UI)
- TanStack Query
- Firebase SDK
- Lucide React (Icons)
- Chart.js

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- Google Gemini AI API
- node-fetch
- CORS

## Next Steps
1. Connect frontend to backend API
2. Implement AI market generation
3. Add smart contract integration
4. Build out social features
5. Implement yield protocols integration
6. Add real-time market updates via Firebase
7. Deploy to production

## User Preferences
- Modern, component-based architecture
- Web3-native with wallet integration
- AI-powered features
- TikTok-style UX for Quick Play
- Glassmorphism design language
