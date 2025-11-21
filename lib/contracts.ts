import { Address, isAddress } from 'viem'
import FIDRegistryABI from '@/abis/FIDRegistry.json'
import DNSRegistryABI from '@/abis/DNSRegistry.json'
import FIDResolverABI from '@/abis/FIDResolver.json'
import TLDRegistryABI from '@/abis/TLDRegistry.json'
import DomainFractionalizationABI from '@/abis/DomainFractionalization.json'
import DomainTreasuryABI from '@/abis/DomainTreasury.json'

/**
 * Validates a contract address from environment variable
 * @param envVar The environment variable value
 * @param name The name of the contract for error messages
 * @returns Validated Address
 * @throws Error if address is invalid or undefined
 */
function validateContractAddress(envVar: string | undefined, name: string): Address {
  if (!envVar) {
    throw new Error(`Contract address not configured: ${name}. Please set the environment variable.`)
  }
  if (!isAddress(envVar)) {
    throw new Error(`Invalid contract address for ${name}: ${envVar}. Must be a valid Ethereum address.`)
  }
  return envVar as Address
}

export const FID_REGISTRY_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_FID_REGISTRY_ADDRESS, 'FID_REGISTRY')
export const DNS_REGISTRY_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_DNS_REGISTRY_ADDRESS, 'DNS_REGISTRY')
export const FID_RESOLVER_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_FID_RESOLVER_ADDRESS, 'FID_RESOLVER')
export const TLD_REGISTRY_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_TLD_REGISTRY_ADDRESS, 'TLD_REGISTRY')
export const DOMAIN_FRACTIONALIZATION_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_DOMAIN_FRACTIONALIZATION_ADDRESS, 'DOMAIN_FRACTIONALIZATION')
export const DOMAIN_TREASURY_ADDRESS = validateContractAddress(process.env.NEXT_PUBLIC_DOMAIN_TREASURY_ADDRESS, 'DOMAIN_TREASURY')

export const FID_REGISTRY_ABI = FIDRegistryABI
export const DNS_REGISTRY_ABI = DNSRegistryABI
export const FID_RESOLVER_ABI = FIDResolverABI
export const TLD_REGISTRY_ABI = TLDRegistryABI
export const DOMAIN_FRACTIONALIZATION_ABI = DomainFractionalizationABI
export const DOMAIN_TREASURY_ABI = DomainTreasuryABI

export const MINT_PRICE = BigInt('0') // Free forever, gas only

