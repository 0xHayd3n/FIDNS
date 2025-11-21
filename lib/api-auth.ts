/**
 * Server-side API authentication utilities
 * Verifies NFT ownership for protected API routes
 */

import { createPublicClient, http, isAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI } from '@/lib/contracts'

/**
 * Verify that a user owns their FID NFT
 * @param address The wallet address to verify
 * @param fid The Farcaster ID to verify
 * @returns true if user owns the NFT, false otherwise
 */
export async function verifyNFTOwnership(
  address: string,
  fid: number
): Promise<boolean> {
  if (!address || !isAddress(address)) {
    return false
  }

  if (!fid || fid <= 0) {
    return false
  }

  if (!FID_REGISTRY_ADDRESS) {
    console.error('FID_REGISTRY_ADDRESS not configured')
    return false
  }

  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    })

    // Get token ID for this FID
    const tokenId = await publicClient.readContract({
      address: FID_REGISTRY_ADDRESS,
      abi: FID_REGISTRY_ABI,
      functionName: 'getTokenIdByFID',
      args: [BigInt(fid)],
    })

    if (!tokenId || tokenId === 0n) {
      return false // FID not minted
    }

    // Check if address owns the token
    const owner = await publicClient.readContract({
      address: FID_REGISTRY_ADDRESS,
      abi: FID_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    })

    return owner.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('Error verifying NFT ownership:', error)
    return false
  }
}

/**
 * Extract FID from request headers or body
 * @param request Next.js request object
 * @returns FID if found, null otherwise
 */
export function getFIDFromRequest(request: Request): number | null {
  // Try to get FID from headers
  const fidHeader = request.headers.get('x-fid')
  if (fidHeader) {
    const fid = parseInt(fidHeader, 10)
    if (!isNaN(fid) && fid > 0) {
      return fid
    }
  }

  return null
}

/**
 * Extract wallet address from request headers or body
 * @param request Next.js request object
 * @returns Address if found and valid, null otherwise
 */
export function getAddressFromRequest(request: Request): string | null {
  // Try to get address from headers
  const addressHeader = request.headers.get('x-address')
  if (addressHeader && isAddress(addressHeader)) {
    return addressHeader
  }

  return null
}

/**
 * Verify request has valid NFT ownership
 * @param request Next.js request object
 * @returns true if valid, false otherwise
 */
export async function verifyRequestOwnership(request: Request): Promise<boolean> {
  const address = getAddressFromRequest(request)
  const fid = getFIDFromRequest(request)

  if (!address || !fid) {
    return false
  }

  return await verifyNFTOwnership(address, fid)
}

