# Deployment Guide

## Prerequisites

1. Node.js 18+ installed
2. npm or yarn package manager
3. Hardhat installed globally (optional): `npm install -g hardhat`
4. Base network RPC URL
5. Private key for deployment (with Base ETH for gas)
6. BaseScan API key (for contract verification)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `BASE_RPC_URL` - Base mainnet RPC URL
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia testnet RPC URL (for testing)
- `PRIVATE_KEY` - Your wallet private key (for deployment)
- `BASESCAN_API_KEY` - BaseScan API key for contract verification

## Step 3: Compile Smart Contracts

```bash
npm run compile
```

This will compile all Solidity contracts and generate artifacts.

## Step 4: Generate ABIs

After compilation, generate the ABI files for the frontend:

```bash
npm run generate-abis
```

This copies the ABIs from Hardhat artifacts to the `abis/` directory.

## Step 5: Deploy Contracts to Base Testnet (Recommended First)

1. Get testnet ETH from Base Sepolia faucet
2. Update `.env.local` with testnet RPC URL
3. Deploy:

```bash
npm run deploy:base -- --network baseSepolia
```

4. Copy the deployed addresses to `.env.local`:
   - `NEXT_PUBLIC_FID_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_DNS_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_FID_RESOLVER_ADDRESS`

## Step 6: Test on Testnet

1. Start the development server:
```bash
npm run dev
```

2. Connect your wallet to Base Sepolia
3. Test minting and DNS management

## Step 7: Deploy to Base Mainnet

1. Ensure you have Base ETH for gas fees
2. Deploy contracts:

```bash
npm run deploy:base -- --network base
```

3. Update `.env.local` with mainnet addresses
4. Verify contracts on BaseScan (optional but recommended)

## Step 8: Deploy Frontend

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Other Hosting

1. Build the project:
```bash
npm run build
```

2. Deploy the `out/` directory to your hosting service
3. Ensure environment variables are set

## Step 9: Configure Farcaster Mini App

1. Update `.well-known/farcaster.json` with your domain
2. Update `public/manifest.json` if needed
3. Ensure your domain is accessible via HTTPS

## Important Notes

- Never commit `.env.local` or private keys to version control
- Test thoroughly on testnet before mainnet deployment
- Consider getting a smart contract audit before mainnet launch
- Keep your private keys secure
- Monitor gas costs and contract interactions

## Troubleshooting

### Contract deployment fails
- Check you have enough ETH for gas
- Verify RPC URL is correct
- Ensure private key is correct

### Frontend can't connect to contracts
- Verify contract addresses in `.env.local`
- Check network is set to Base
- Ensure ABIs are generated correctly

### Farcaster SDK not working
- Ensure app is accessed from within a Farcaster client
- Check `.well-known/farcaster.json` is accessible
- Verify HTTPS is enabled

