import { Address } from 'viem'
import FIDRegistryABI from '@/abis/FIDRegistry.json'
import DNSRegistryABI from '@/abis/DNSRegistry.json'
import FIDResolverABI from '@/abis/FIDResolver.json'

export const FID_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_FID_REGISTRY_ADDRESS as Address
export const DNS_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_DNS_REGISTRY_ADDRESS as Address
export const FID_RESOLVER_ADDRESS = process.env.NEXT_PUBLIC_FID_RESOLVER_ADDRESS as Address

export const FID_REGISTRY_ABI = FIDRegistryABI
export const DNS_REGISTRY_ABI = DNSRegistryABI
export const FID_RESOLVER_ABI = FIDResolverABI

export const MINT_PRICE = BigInt('1000000000000000') // 0.001 ETH in wei

