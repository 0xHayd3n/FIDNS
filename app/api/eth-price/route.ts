import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

// Base Sepolia testnet ETH/USD price feed address
// For Base Sepolia, use a testnet price feed or fallback
// Note: Base Sepolia may not have a Chainlink price feed, so this may need adjustment
const ETH_USD_PRICE_FEED = process.env.ETH_USD_PRICE_FEED || '0x4aDC67696bA383F8DDd44C6BcA6b1C0F26D24B5F'

// Cache price for 60 seconds to reduce API calls
let cachedPrice: { price: number; timestamp: number; expiresAt: number } | null = null
const CACHE_DURATION = 60 * 1000 // 60 seconds

export async function GET() {
  try {
    // Check cache first
    if (cachedPrice && Date.now() < cachedPrice.expiresAt) {
      return NextResponse.json({
        price: cachedPrice.price,
        timestamp: cachedPrice.timestamp,
        cached: true,
      })
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    })

    const [price, decimals] = await Promise.all([
      publicClient.readContract({
        address: ETH_USD_PRICE_FEED as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'latestRoundData',
            outputs: [
              { name: 'roundId', type: 'uint80' },
              { name: 'answer', type: 'int256' },
              { name: 'startedAt', type: 'uint256' },
              { name: 'updatedAt', type: 'uint256' },
              { name: 'answeredInRound', type: 'uint80' },
            ],
            stateMutability: 'view',
            type: 'function',
          },
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'latestRoundData',
      }) as Promise<[bigint, bigint, bigint, bigint, bigint]>,
      publicClient.readContract({
        address: ETH_USD_PRICE_FEED as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'decimals',
      }),
    ])

    // Price comes with 8 decimals, convert to number
    // latestRoundData returns: [roundId, answer, startedAt, updatedAt, answeredInRound]
    const priceInUSD = Number(price[1]) / 10 ** Number(decimals) // answer is at index 1
    const timestamp = Number(price[3]) // updatedAt is at index 3

    // Update cache
    cachedPrice = {
      price: priceInUSD,
      timestamp,
      expiresAt: Date.now() + CACHE_DURATION,
    }

    return NextResponse.json({
      price: priceInUSD,
      timestamp,
      decimals: Number(decimals),
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ETH price' },
      { status: 500 }
    )
  }
}

