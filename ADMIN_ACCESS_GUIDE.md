# Admin Panel Access Guide

## Overview
The admin panel now has **three secure ways to access it**, instead of just the 5-tap gesture. This prevents accidental access while providing multiple convenient options for administrators.

---

## ✅ Method 1: URL Parameter (Recommended)
**Most Secure & Professional**

Simply add `?admin=1` or `#admin` to your app URL:

### Examples:
```
https://your-app.replit.app/app.html?admin=1
https://your-app.replit.app/app.html#admin
```

### Benefits:
- ✅ No accidental access
- ✅ Can bookmark the admin URL
- ✅ Easy to share with authorized admins
- ✅ Clean and professional

---

## ✅ Method 2: Hidden Footer Link
**Quick Access from Profile**

1. Navigate to your **Profile** screen
2. Scroll to the bottom (below the logout button)
3. You'll see a small **⚙️ gear icon** (very subtle)
4. Click it to open the admin login

### Benefits:
- ✅ Always accessible when logged in
- ✅ Discreet and hidden from regular users
- ✅ No accidental tapping

---

## ✅ Method 3: 5-Tap Gesture (Legacy)
**Still available but improved**

Quickly tap the "Predora" logo **5 times within 2 seconds**:

### Improved Behavior:
- ✅ **Single tap** = Navigate to home screen (new!)
- ✅ **5 rapid taps** = Open admin login
- ✅ Shows toast message when unlocked
- ✅ 2-second timeout resets counter

### Where to tap:
- Desktop: Top-left "Predora" logo in navbar
- Mobile: "Predora" logo in mobile header

---

## Authentication

All three methods require the **same secure password**:

1. After accessing via any method, you'll see the **Admin Password** screen
2. Enter your `ADMIN_SECRET` password
3. Password is validated **server-side** against environment variable
4. Incorrect password shows error toast
5. Successful login opens the Admin Control Panel

### Security Features:
- ✅ Backend validation using `ADMIN_SECRET` environment variable
- ✅ Fail-closed: No admin access if `ADMIN_SECRET` is not configured
- ✅ Session-based: Password stored in sessionStorage for convenience
- ✅ No hardcoded passwords in frontend code

---

## Admin Panel Features

Once authenticated, you have access to:

1. **Market Resolution** - Manually resolve standard markets
2. **Quick Play Management** - Generate and resolve Quick Play markets
3. **Quick Poll Management** - Manage Quick Poll markets
4. **Jury System** - View disputed markets and jury votes
5. **AI Guardrails** - Quality control, duplicate detection, Sybil protection
6. **Account Abstraction** - Configure AA settings and view stats

---

## Configuration

### Set Admin Password (Required)

The admin password is configured via environment variable in Replit Secrets:

1. Go to Replit **Secrets** (left sidebar, lock icon)
2. Add secret: `ADMIN_SECRET`
3. Set value to your secure password
4. Restart the workflow

**Important:** Without `ADMIN_SECRET` configured, admin access is completely disabled for security.

---

## Troubleshooting

### "Incorrect password" error
- Check that `ADMIN_SECRET` is set in Replit Secrets
- Verify you're entering the exact password (case-sensitive)
- Restart the workflow if you just added the secret

### 5-tap gesture not working
- Make sure you tap within **2 seconds**
- Tap the "Predora" text, not the surrounding area
- Use Method 1 or 2 instead (more reliable)

### Can't find admin access
- **Method 1:** Use `?admin=1` URL parameter (easiest)
- **Method 2:** Check profile footer for ⚙️ icon
- **Method 3:** Rapid-tap the Predora logo 5 times

---

## Recommendations

### For Production:
1. Use **Method 1 (URL parameter)** - Most secure
2. Bookmark the admin URL for quick access
3. Don't share the admin URL publicly
4. Use a strong `ADMIN_SECRET` password
5. Rotate password periodically

### For Development:
1. Use **Method 2 (Footer link)** - Quick access while testing
2. Keep browser console open to see admin login attempts
3. Test all three methods to ensure they work

---

## Security Best Practices

1. **Strong Password:** Use a long, random password for `ADMIN_SECRET`
2. **Environment Variables:** Never hardcode passwords in code
3. **HTTPS Only:** Always use HTTPS in production
4. **Session Management:** Clear session when logging out
5. **Audit Logs:** Monitor admin actions (future enhancement)

---

## Summary

| Method | Access Method | Security | Convenience | Accidental Access Risk |
|--------|--------------|----------|-------------|------------------------|
| URL Parameter | `?admin=1` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | None |
| Footer Link | Click ⚙️ in profile | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Very Low |
| 5-Tap Gesture | Tap logo 5× | ⭐⭐⭐ | ⭐⭐⭐ | Very Low |

**Recommended:** Use URL parameter method for production admin access.

---

All methods are secure and require the same password authentication. Choose the method that works best for your workflow! 🛡️
