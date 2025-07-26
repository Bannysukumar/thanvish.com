# Firebase Setup Instructions

Your travel agency website is configured to use Firebase, but the database needs to be set up first.

## Quick Setup Steps:

### 1. Go to Firebase Console
- Visit: https://console.firebase.google.com
- Sign in with your Google account

### 2. Find Your Project
- Look for project: `travaling-76f20`
- If it doesn't exist, create a new project

### 3. Enable Realtime Database
- Click "Realtime Database" in the left sidebar
- Click "Create Database" button
- Choose "Start in test mode" 
- Select your preferred region

### 4. Configure Database Rules (for testing)
- Go to "Rules" tab in Realtime Database
- Replace the rules with:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
- Click "Publish"

### 5. Test Your Website
- Go back to your admin dashboard
- Try adding a package
- It should work now!

## Security Note
The rules above allow anyone to read/write to your database. For production, you should implement proper authentication and security rules.

## Troubleshooting
If you still get 404 errors:
1. Make sure the Realtime Database is created (not Firestore)
2. Check that the database URL matches: `https://travaling-76f20.firebaseio.com`
3. Verify the rules are published and active

## Need Help?
If you're still having issues, the project can also work with a demo database for testing purposes.