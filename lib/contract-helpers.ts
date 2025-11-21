import { Address } from 'viem'
import { TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from './contracts'

/**
 * Helper functions for contract interactions
 */

/**
 * Get domain info from contract
 * @param domain Full domain name (e.g., "example.com")
 * @param publicClient Viem public client
 * @returns Domain info or null if not found
 */
export async function getDomainInfo(
  domain: string,
  publicClient: any
): Promise<{
  owner: Address
  registrationTimestamp: number
  expirationTimestamp: number
  yearsPurchased: number
  tld: string
} | null> {
  if (!TLD_REGISTRY_ADDRESS || !publicClient) return null

  try {
    const result = await publicClient.readContract({
      address: TLD_REGISTRY_ADDRESS,
      abi: TLD_REGISTRY_ABI,
      functionName: 'domainInfo',
      args: [domain],
    }) as [string, bigint, bigint, bigint, string]

    return {
      owner: result[0] as Address,
      registrationTimestamp: Number(result[1]),
      expirationTimestamp: Number(result[2]),
      yearsPurchased: Number(result[3]),
      tld: result[4],
    }
  } catch (error) {
    console.error(`Error fetching domain info for ${domain}:`, error)
    return null
  }
}

/**
 * Check if domain is available
 * @param domain Full domain name
 * @param publicClient Viem public client
 * @returns True if available
 */
export async function checkDomainAvailability(
  domain: string,
  publicClient: any
): Promise<boolean> {
  if (!TLD_REGISTRY_ADDRESS || !publicClient) return false

  try {
    const result = await publicClient.readContract({
      address: TLD_REGISTRY_ADDRESS,
      abi: TLD_REGISTRY_ABI,
      functionName: 'isDomainAvailable',
      args: [domain],
    })

    return result as boolean
  } catch (error) {
    console.error(`Error checking availability for ${domain}:`, error)
    return false
  }
}

/**
 * Get TLD price per year
 * @param tld TLD (e.g., "com")
 * @param publicClient Viem public client
 * @returns Price in wei or null
 */
export async function getTLDPrice(
  tld: string,
  publicClient: any
): Promise<bigint | null> {
  if (!TLD_REGISTRY_ADDRESS || !publicClient) return null

  try {
    const result = await publicClient.readContract({
      address: TLD_REGISTRY_ADDRESS,
      abi: TLD_REGISTRY_ABI,
      functionName: 'tldPrices',
      args: [tld],
    })

    return result as bigint
  } catch (error) {
    console.error(`Error fetching TLD price for ${tld}:`, error)
    return null
  }
}

