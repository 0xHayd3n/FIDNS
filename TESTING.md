# Testing Farcaster Mini App Locally

## Quick Start

### Option 1: Using ngrok (Recommended)

1. **Install ngrok** (if not already installed):
   - Download from: https://ngrok.com/download
   - Or use: `npm install -g ngrok`

2. **Start your dev server**:
   ```bash
   npm run dev
   ```
   Your app will run on `http://localhost:3000`

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** from ngrok (e.g., `https://abc123.ngrok.io`)

5. **Update `.well-known/farcaster.json`** with your ngrok URL

6. **Access from Farcaster**:
   - Open Farcaster (Warpcast app or web)
   - Navigate to your mini app URL
   - Or create a cast with a link to your mini app

### Option 2: Using Cloudflare Tunnel (Free Alternative)

1. **Install Cloudflare Tunnel**:
   ```bash
   # Windows (PowerShell)
   winget install --id Cloudflare.cloudflared
   ```

2. **Start your dev server**:
   ```bash
   npm run dev
   ```

3. **In a new terminal, start tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Copy the HTTPS URL** and update `.well-known/farcaster.json`

### Option 3: Deploy to Vercel (Easiest for Testing)

1. **Push to GitHub**

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repo
   - Add environment variables
   - Deploy

3. **Update `.well-known/farcaster.json`** with your Vercel URL

## Important Notes

- Farcaster mini apps **require HTTPS** - localhost won't work
- The `.well-known/farcaster.json` file must be accessible at `https://your-domain.com/.well-known/farcaster.json`
- Make sure your app is accessible from the internet (not just localhost)
- Test in the Farcaster client (Warpcast) for full functionality

## Troubleshooting

- **Can't access mini app**: Check that your tunnel is running and the URL is correct
- **Farcaster context not loading**: Make sure you're accessing from within a Farcaster client
- **CORS errors**: Next.js should handle this, but check your `next.config.js`

