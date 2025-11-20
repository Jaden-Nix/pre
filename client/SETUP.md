# Predora Client Setup Guide

## Prerequisites

Before you begin, you'll need to create accounts and obtain API keys from the following services:

1. **Firebase** (for authentication and real-time database)
2. **WalletConnect** (for Web3 wallet connections)

## Environment Setup

### 1. Create your environment file

Copy the example environment file to create your local configuration:

```bash
cd client
cp .env.local.example .env.local
```

### 2. Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click on the gear icon → Project settings
4. Scroll down to "Your apps" and click the Web icon (`</>`)
5. Register your app and copy the configuration values
6. Add these values to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID
5. Add it to your `.env.local` file:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 4. Configure API URL (Optional)

For local development, the default API URL is already set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the Application

Once you've configured your environment variables:

```bash
npm run dev
```

The application will start at `http://localhost:5000`

## Troubleshooting

### Firebase Errors

If you see "Firebase: Error (auth/invalid-api-key)", verify that:
- Your `.env.local` file exists in the `client/` directory
- All Firebase environment variables are correctly set
- There are no quotes around the values
- You've restarted the development server after adding environment variables

### Web3 Functionality

⚠️ **Note**: Web3 wallet connection (RainbowKit) has been temporarily disabled due to Turbopack compilation issues. The "Connect Wallet" button is currently a static UI element. Web3 functionality will be restored in a future update with proper code splitting.

## Next Steps

- Set up Firebase Authentication rules
- Configure Firestore database
- Add your backend server configuration
- Deploy to production when ready

## Security Reminders

- ⚠️ Never commit your `.env.local` file to version control
- ⚠️ Never share your API keys publicly
- ✅ Use environment variables for all sensitive configuration
- ✅ The `.env.local.example` file is safe to commit (contains no real credentials)
