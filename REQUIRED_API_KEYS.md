# Required API Keys and Setup Guide for Predora

This document outlines all the API keys and configurations needed to get Predora fully operational.

## 🔑 Required API Keys

### 1. **OpenAI API Key** (Optional - for AI features)
- **Purpose**: Powers AI-based market resolution and insights
- **Status**: ⚠️ Not configured
- **How to get it**: Sign up at https://platform.openai.com/api-keys
- **How to add it**: Add `OPENAI_API_KEY` to Replit Secrets

### 2. **SendGrid API Key** (Required for Email OTP Login)
- **Purpose**: Sends email verification codes for user authentication
- **Status**: ⚠️ Not configured (integration added but needs setup)
- **How to get it**: 
  1. Sign up at https://sendgrid.com
  2. Create an API key with "Mail Send" permissions
  3. Verify a sender email address
- **How to add it**: 
  - Add `SENDGRID_API_KEY` to Replit Secrets
  - Add `SENDGRID_FROM_EMAIL` to Replit Secrets (your verified sender email)

### 3. **Firebase Configuration** (Required for Authentication)
- **Purpose**: Handles Google, X/Twitter, and Email/Password authentication
- **Status**: ⚠️ Needs configuration
- **What you need**:
  - Firebase project credentials (already in code)
  - Enable authentication providers in Firebase Console
- **Setup Steps**:
  1. Go to Firebase Console (https://console.firebase.google.com)
  2. Navigate to your Predora project
  3. Go to Authentication → Sign-in method
  4. Enable the following providers:
     - **Google** ✅
     - **Twitter** ✅ (for X login)
     - **Email/Password** ✅
  5. For Twitter/X:
     - You'll need to create a Twitter Developer account
     - Create an app at https://developer.twitter.com
     - Add the API key and secret to Firebase

### 4. **Google Application Credentials** (Optional - for Firebase Admin SDK)
- **Purpose**: Server-side Firebase operations
- **Status**: ⚠️ Not configured
- **How to get it**: 
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Generate new private key
  3. Download the JSON file
- **How to add it**: Add the JSON content to `GOOGLE_APPLICATION_CREDENTIALS` secret

## 🎯 Quick Setup Priority

### Essential (App Won't Work Without These):
1. ✅ **Demo Mode** - Already working! No keys needed
2. 🔧 **Firebase Authentication Providers** - Enable Google, Twitter, Email/Password in Firebase Console
3. 🔧 **SendGrid** - For email OTP login (setup the integration that's already added)

### Optional (Enhanced Features):
4. ⚡ **OpenAI** - For AI market resolution
5. ⚡ **Firebase Admin SDK** - For advanced server operations

## 📝 How to Add Secrets in Replit

1. Click the **🔒 Secrets** icon in the left sidebar (or Tools → Secrets)
2. Click **"+ New Secret"**
3. Enter the key name (e.g., `OPENAI_API_KEY`)
4. Paste the value
5. Click **"Add Secret"**

## 🔗 Helpful Links

- OpenAI API Keys: https://platform.openai.com/api-keys
- SendGrid Dashboard: https://app.sendgrid.com
- Firebase Console: https://console.firebase.google.com
- Twitter Developer Portal: https://developer.twitter.com/en/portal/dashboard

## ✨ What's Already Working

- ✅ Demo accounts (Bob, Alice, Judge) - No setup needed!
- ✅ Web3 wallet login (MetaMask)
- ✅ Full UI and frontend
- ✅ Market creation and betting
- ✅ Verifiable source display for resolved markets

## 🎮 Current Login Options

1. **Web3 Wallet** (MetaMask) - Works now
2. **Google** - Needs Firebase provider enabled
3. **X (Twitter)** - Needs Firebase provider + Twitter app setup
4. **Email** - Needs SendGrid setup
5. **Demo Mode** - Works now! Choose Bob, Alice, or Judge

## 📧 SendGrid Integration Next Steps

You have SendGrid integration already added to the project. To complete the setup:

1. Get your SendGrid API key from https://app.sendgrid.com
2. Verify a sender email address in SendGrid
3. Add both secrets to Replit:
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
4. The integration will automatically configure the rest!
