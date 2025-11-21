import { Address } from 'viem'

/**
 * USDC token addresses on Base
 */
export const USDC_ADDRESSES = {
  mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  sepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // Base Sepolia USDC testnet
}

/**
 * ERC20 ABI for USDC (minimal - just what we need)
 */
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const

/**
 * Get USDC address for current network
 * @param chainId The chain ID
 * @returns USDC token address
 */
export function getUSDCAddress(chainId: number): Address {
  // Base mainnet: 8453, Base Sepolia: 84532
  if (chainId === 8453) {
    return USDC_ADDRESSES.mainnet
  } else if (chainId === 84532) {
    return USDC_ADDRESSES.sepolia
  }
  // Default to Sepolia testnet
  return USDC_ADDRESSES.sepolia
}

