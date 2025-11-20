# Required API Keys and Setup Guide for Predora

This document outlines all the API keys and configurations needed to get Predora fully operational.

## 🔑 Required API Keys

### 1. **Gemini API Key** (CRITICAL - for Auto-Resolution)
- **Purpose**: Powers automatic market resolution with verifiable sources
- **Status**: ⚠️ **NOT CONFIGURED** - Markets won't auto-resolve without this!
- **How to get it**: 
  1. Go to https://makersuite.google.com/app/apikey
  2. Create a new API key
  3. Copy the key
- **How to add it**: Add `GEMINI_API_KEY` to Replit Secrets (NOTE: exact name is critical!)
- **Why it's critical**: Without this, markets will NOT auto-resolve when their resolution time passes!

### 2. **Admin Password** (Required for Admin Panel Access)
- **Purpose**: Protects access to the admin control panel
- **Status**: ⚠️ Not configured
- **How to set it**: 
  1. Choose a secure password (e.g., `predora_admin_2025`)
  2. Add `ADMIN_SECRET` to Replit Secrets with your chosen password
- **How to use it**: 
  - Visit `yourapp.com/app.html?admin=1`
  - Enter your password
  - Access admin panel to manually resolve markets, manage disputes, etc.
- **Access methods**:
  - URL: Add `?admin=1` or `#admin` to your app URL
  - Hidden link: Gear icon at bottom of profile page
  - 5-tap gesture: Tap Predora logo 5 times rapidly

### 3. **SendGrid API Key** (Required for Email OTP Login)
- **Purpose**: Sends email verification codes for user authentication
- **Status**: ⚠️ Not configured (integration added but needs setup)
- **How to get it**: 
  1. Sign up at https://sendgrid.com
  2. Create an API key with "Mail Send" permissions
  3. Verify a sender email address
- **How to add it**: 
  - Add `SENDGRID_API_KEY` to Replit Secrets
  - Add `SENDGRID_FROM_EMAIL` to Replit Secrets (your verified sender email)

### 4. **Firebase Configuration** (Required for Social Authentication)
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
     - Create a Twitter Developer account
     - Create an app at https://developer.twitter.com
     - Add the API key and secret to Firebase

### 5. **Firebase Admin SDK** (Optional - for Enhanced Features)
- **Purpose**: Server-side Firebase operations and admin functions
- **Status**: ⚠️ Not configured
- **How to get it**: 
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Generate new private key
  3. Download the JSON file
- **How to add it**: Add the JSON content as a multiline secret `GOOGLE_APPLICATION_CREDENTIALS`

## 🎯 Quick Setup Priority

### CRITICAL (Markets Won't Resolve Without This!):
1. 🚨 **Gemini API Key** (`GEMINI_API_KEY`) - MUST HAVE for auto-resolution!
2. 🔐 **Admin Password** (`ADMIN_SECRET`) - To manually resolve markets if needed

### Essential (For User Authentication):
3. ✅ **Demo Mode** - Already working! No keys needed
4. 🔧 **Firebase Authentication Providers** - Enable Google, Twitter, Email/Password in Firebase Console
5. 🔧 **SendGrid** - For email OTP login (integration already added)

### Optional (Enhanced Features):
6. ⚡ **Firebase Admin SDK** - For advanced server operations

## 📝 How to Add Secrets in Replit

1. Click the **🔒 Secrets** icon in the left sidebar (or Tools → Secrets)
2. Click **"+ New Secret"**
3. Enter the key name (e.g., `OPENAI_API_KEY`)
4. Paste the value
5. Click **"Add Secret"**

## 🔗 Helpful Links

- **Gemini API (CRITICAL)**: https://makersuite.google.com/app/apikey
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

## 🚀 Quick Start Guide

### Step 1: Get Markets Auto-Resolving (5 minutes)
1. Go to https://makersuite.google.com/app/apikey
2. Create a Gemini API key
3. Add to Replit Secrets: `GEMINI_API_KEY` = your key (exact name is critical!)
4. **Done!** Markets will now auto-resolve with verifiable sources when their resolution time passes

### Step 2: Set Admin Password (2 minutes)
1. Choose a secure password
2. Add to Replit Secrets: `ADMIN_SECRET` = your password
3. Access admin panel: `yourapp.com/app.html?admin=1`
4. Use it to manually resolve markets or handle disputes

### Step 3: Enable Email Login (10 minutes)
1. Sign up at SendGrid: https://app.sendgrid.com
2. Create API key + verify sender email
3. Add to Replit Secrets:
   - `SENDGRID_API_KEY` = your API key
   - `SENDGRID_FROM_EMAIL` = your verified email
4. **Done!** Email OTP login now works

### Step 4: Enable Social Logins (15 minutes)
1. Go to Firebase Console: https://console.firebase.google.com
2. Authentication → Sign-in method
3. Enable Google, Twitter, and Email/Password
4. For Twitter: Create app at https://developer.twitter.com
5. **Done!** All login methods now work

## 📧 SendGrid Integration

You have SendGrid integration already added to the project. Complete setup:
1. Get API key from https://app.sendgrid.com
2. Verify sender email in SendGrid
3. Add both secrets to Replit (see Step 3 above)

## 🔍 Why Markets Aren't Auto-Resolving

If markets are sitting unresolved even after their resolution time:
- ❌ Missing `GEMINI_API_KEY` - Add it now! (NOTE: Must be exactly this name)
- ✅ Once added, the auto-resolution job will run and resolve past-due markets
- ✅ It will also add verifiable source links automatically

## 🎯 What Happens After Adding Gemini API Key

Once you add the Gemini API key:
1. ✅ Markets auto-resolve at their resolution time
2. ✅ AI searches for verifiable sources
3. ✅ Resolution rationale is generated
4. ✅ Source link is saved (you'll see "View Verifiable Source" button)
5. ✅ Payouts are automatically distributed

Without it, markets just sit there forever! 🤷‍♂️
