import { Address, formatEther, parseEther } from 'viem'

export function formatEth(value: bigint): string {
  return formatEther(value)
}

export function parseEth(value: string): bigint {
  return parseEther(value)
}

export function shortenAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

