/**
 * Centralized validation utilities
 * Reusable validation functions for addresses, numbers, and domain sanitization
 */

import { isAddress } from 'viem'
import { isValidAddress } from './ethereum'

/**
 * Validates an Ethereum address
 * @param address The address to validate
 * @returns True if valid, false otherwise
 */
export function validateAddress(address: string): boolean {
  return isValidAddress(address) && isAddress(address)
}

/**
 * Validates a positive integer within safe range
 * @param value The value to validate
 * @param min Minimum value (default: 1)
 * @param max Maximum value (default: Number.MAX_SAFE_INTEGER)
 * @returns True if valid, false otherwise
 */
export function validatePositiveInteger(
  value: number,
  min: number = 1,
  max: number = Number.MAX_SAFE_INTEGER
): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

/**
 * Validates a positive number (can be decimal)
 * @param value The value to validate
 * @param min Minimum value (default: 0)
 * @param max Maximum value (default: Infinity)
 * @returns True if valid, false otherwise
 */
export function validatePositiveNumber(
  value: number,
  min: number = 0,
  max: number = Infinity
): boolean {
  return !isNaN(value) && isFinite(value) && value >= min && value <= max
}

/**
 * Validates a BigInt value
 * @param value The BigInt value to validate
 * @param min Minimum value (default: 0n)
 * @param max Maximum value (optional)
 * @returns True if valid, false otherwise
 */
export function validateBigInt(
  value: bigint,
  min: bigint = 0n,
  max?: bigint
): boolean {
  if (value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

/**
 * Sanitizes domain name to prevent XSS attacks
 * Removes HTML special characters that could be used for injection
 * @param domain The domain name to sanitize
 * @returns Sanitized domain name
 */
export function sanitizeDomain(domain: string): string {
  // Remove HTML special characters: <, >, ", ', &
  return domain.replace(/[<>"']/g, '').replace(/&/g, 'and')
}

/**
 * Validates contract address from environment variable
 * @param envVar The environment variable value
 * @param name The name of the contract for error messages
 * @returns Validated address string
 * @throws Error if address is invalid or undefined
 */
export function validateContractAddress(envVar: string | undefined, name: string): string {
  if (!envVar) {
    throw new Error(`Contract address not configured: ${name}. Please set the environment variable.`)
  }
  if (!isAddress(envVar)) {
    throw new Error(`Invalid contract address for ${name}: ${envVar}. Must be a valid Ethereum address.`)
  }
  return envVar
}

