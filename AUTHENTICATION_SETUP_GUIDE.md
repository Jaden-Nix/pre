# Authentication Setup Guide for Predora

## Current Issues
- ❌ Google Sign-In: "auth/popup-blocked" + "Domain not authorized"
- ❌ X (Twitter) Sign-In: "auth/popup-blocked" + "Domain not authorized"
- ⚠️ Email OTP: SendGrid needs configuration

---

## 🔧 Fix 1: Authorize Replit Domain in Firebase

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Predora project
3. Click **Authentication** in the left sidebar
4. Click the **Settings** tab
5. Scroll to **Authorized domains**
6. Click **"Add domain"**
7. Add your Replit domain:
   - Format: `[your-repl-name].[your-username].repl.co`
   - Or your custom domain if you have one
8. Click **Save**

**Example domains to add:**
```
predora.your-username.repl.co
your-custom-domain.com
```

**Note:** You may also need to add `127.0.0.1` and `localhost` for local testing.

---

## 🔧 Fix 2: Enable Google Sign-In Provider

### Steps:
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Find **Google** in the list
3. Click **Enable**
4. Add your **support email** (required by Google)
5. Click **Save**

**Status:** ✅ Should already be enabled (since you have the API key configured)

---

## 🔧 Fix 3: Enable X (Twitter) Sign-In Provider

### Steps:
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Find **Twitter** in the list
3. Click **Enable**
4. You'll need **Twitter API credentials**:
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Create a new app (or use existing)
   - Get your **API Key** and **API Secret**
5. Paste them into Firebase
6. Copy the **OAuth redirect URL** from Firebase
7. Add it to your Twitter app settings under **"Callback URLs"**
8. Click **Save** in Firebase

**Note:** Twitter OAuth requires Twitter Developer account approval (can take 1-2 days).

---

## 🔧 Fix 4: Setup SendGrid for Email OTP

### Steps:

#### Option A: Use Replit SendGrid Integration (Recommended)
1. In Replit, click **Tools** → **Integrations**
2. Search for **SendGrid**
3. Click **Connect**
4. Follow the prompts to authenticate
5. The integration will automatically set up API keys

#### Option B: Manual Setup
1. Go to [SendGrid](https://sendgrid.com/)
2. Create account (or sign in)
3. Go to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Give it a name: "Predora Email OTP"
6. Select **Full Access** (or just "Mail Send")
7. Copy the API key
8. In Replit Secrets, add:
   - Key: `SENDGRID_API_KEY`
   - Value: [your API key]
9. Verify your sender email:
   - Go to SendGrid → **Settings** → **Sender Authentication**
   - Click **"Verify a Single Sender"**
   - Fill out the form with your email
   - Check your email and click the verification link

**Current Status:** ⚠️ SendGrid integration shows "NEEDS SETUP"

---

## 🔧 Fix 5: Allow Popups in Browser

The `"auth/popup-blocked"` error means your browser is blocking authentication popups.

### Steps:
1. Look for the **popup blocked icon** in your browser's address bar (usually on the right)
2. Click it and select **"Always allow popups from this site"**
3. Try signing in again

**Alternative:** Use redirect-based sign-in instead of popup (requires code change)

---

## 🎯 Recommended Authentication Flow

Since you now have **custodial wallets**, here's the best user experience:

### Simplified Login (Email Only)
1. User enters email
2. OTP sent via SendGrid
3. User verifies OTP
4. **Custodial wallet auto-created** ✨
5. User is logged in and ready to bet (gasless!)

### Why This Works Better:
- No need for Google/Twitter OAuth complexity
- Faster onboarding
- Works with custodial wallets seamlessly
- No gas fees needed

---

## 📋 Quick Checklist

- [ ] Add Replit domain to Firebase authorized domains
- [ ] Verify Google sign-in is enabled in Firebase
- [ ] (Optional) Setup Twitter OAuth if you want X login
- [ ] Setup SendGrid integration for email OTP
- [ ] Allow popups in browser
- [ ] Test email login flow

---

## 🚨 Priority Fix

**Most Important:** Add your Replit domain to Firebase authorized domains - this will fix Google and X sign-in immediately.

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `[your-repl-name].[username].repl.co`
3. Save and refresh your app

After this, the popup-blocked error should go away (just make sure to allow popups in your browser).

---

## 🆘 Still Having Issues?

If authentication still doesn't work:

1. **Check Firebase Console** → Authentication → Users
   - See if any users are being created when you try to sign in
   
2. **Check Browser Console** (F12)
   - Look for specific Firebase error messages
   - Share them so I can help debug

3. **Try Email OTP Instead**
   - Setup SendGrid (easier than OAuth)
   - Use email-based authentication
   - This works perfectly with custodial wallets!

---

## 💡 Best Practice

For a prediction market dApp, **email-based authentication** is actually better because:
- Users don't need to link social accounts
- Works seamlessly with custodial wallets
- Faster sign-up process
- No external OAuth dependencies

Consider making email OTP your primary login method and keeping social login as optional!
