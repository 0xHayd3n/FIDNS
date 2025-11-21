/**
 * Rate limiting utility with persistent storage
 * Uses file system to persist rate limit data across server restarts
 */

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitStore {
  [key: string]: RateLimitEntry
}

// Use /tmp directory in serverless environments (Vercel, etc.) or project root in regular Node.js
const RATE_LIMIT_FILE = process.env.VERCEL 
  ? path.join('/tmp', '.rate-limit-store.json')
  : path.join(process.cwd(), '.rate-limit-store.json')
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per hour per IP

let rateLimitStore: RateLimitStore = {}
let storeInitialized = false

/**
 * Load rate limit store from file
 */
async function loadStore(): Promise<void> {
  if (storeInitialized) return

  try {
    const data = await fs.readFile(RATE_LIMIT_FILE, 'utf-8')
    rateLimitStore = JSON.parse(data)
    // Clean up expired entries
    await cleanupExpiredEntries()
  } catch (error) {
    // File doesn't exist or is invalid, start with empty store
    rateLimitStore = {}
  }
  
  storeInitialized = true
}

/**
 * Save rate limit store to file
 */
async function saveStore(): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(RATE_LIMIT_FILE)
    try {
      await fs.access(dir)
    } catch {
      // Directory doesn't exist, but /tmp should always exist in serverless
      // For project root, it should exist, so this is just a safety check
    }
    
    await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(rateLimitStore, null, 2), 'utf-8')
  } catch (error) {
    // If file write fails (e.g., in read-only filesystem), fall back to in-memory
    // This provides graceful degradation
    console.warn('Failed to save rate limit store, using in-memory fallback:', error)
  }
}

/**
 * Clean up expired entries from the store
 */
async function cleanupExpiredEntries(): Promise<void> {
  const now = Date.now()
  const keys = Object.keys(rateLimitStore)
  
  for (const key of keys) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  }
  
  if (keys.length !== Object.keys(rateLimitStore).length) {
    await saveStore()
  }
}

/**
 * Check if request exceeds rate limit
 * @param ip The IP address of the requester
 * @returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  await loadStore()
  
  const now = Date.now()
  const entry = rateLimitStore[ip]

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore[ip] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    }
    await saveStore()
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true // Rate limit exceeded
  }

  entry.count++
  await saveStore()
  return false
}

/**
 * Reset rate limit for an IP (useful for testing or manual override)
 */
export async function resetRateLimit(ip: string): Promise<void> {
  await loadStore()
  delete rateLimitStore[ip]
  await saveStore()
}

/**
 * Get current rate limit status for an IP
 */
export async function getRateLimitStatus(ip: string): Promise<{
  count: number
  resetTime: number
  remaining: number
} | null> {
  await loadStore()
  const entry = rateLimitStore[ip]
  
  if (!entry) {
    return null
  }
  
  const now = Date.now()
  if (now > entry.resetTime) {
    return null // Expired
  }
  
  return {
    count: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
  }
}

