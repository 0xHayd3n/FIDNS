# FIDNS - Farcaster .FID DNS Mini App

A decentralized DNS manager built as a Farcaster mini app that allows users to mint and manage `.FID` domains tied to their Farcaster ID.

## Features

- Mint a unique `.FID` domain (e.g., `1355634.FID` or `0xhayd3n.fid`) as an ERC721 NFT
- On-chain DNS record management
- Wallet-based ownership
- Farcaster account integration
- ENS name hiding when .FID exists

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Hardhat for smart contract development

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.local.example` to `.env.local` and fill in your configuration:
```bash
cp .env.local.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

### Smart Contract Development

1. Compile contracts:
```bash
npm run compile
```

2. Deploy to Base network:
```bash
npm run deploy:base
```

## Project Structure

- `contracts/` - Smart contracts (Solidity)
- `app/` - Next.js app directory
- `components/` - React components
- `lib/` - Utility functions and contract interactions
- `hooks/` - Custom React hooks
- `scripts/` - Deployment scripts

## License

MIT

