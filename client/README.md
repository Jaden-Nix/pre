# Predora Client - Next.js Frontend

## Setup Instructions

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the required values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

- **NEXT_PUBLIC_API_URL**: Backend API URL (default: http://localhost:3001)
- **Firebase Config**: Get from Firebase Console → Project Settings → Your apps → SDK setup and configuration
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID
- **NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID**: Get from https://cloud.walletconnect.com/

### 2. Firebase Setup

1. Create a Firestore database in your Firebase project
2. Create a collection named `standard_markets`
3. (Optional) Add sample market documents to test the app

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5000

### 4. Start Backend Server

The Express backend must be running for AI market generation to work:

```bash
cd ../server
npm start
```

Backend will run on port 3001.

## Project Structure

- `/app` - Next.js App Router pages
- `/components` - React components
- `/hooks` - Custom React hooks (Firebase, API)
- `/lib` - Configuration (Firebase, Web3)
- `/types` - TypeScript type definitions

## Features

- **Quick Play**: TikTok-style swipe interface for markets
- **Markets**: Browse and filter prediction markets
- **Create**: AI-powered market generation
- **Profile**: User stats and activity
- **Web3**: Wallet connection with RainbowKit

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Firebase (Firestore)
- wagmi + RainbowKit (Web3)
- Chart.js
