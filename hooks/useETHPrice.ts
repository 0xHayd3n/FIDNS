import { useState, useEffect } from 'react'

interface ETHPriceData {
  price: number
  timestamp: number
  decimals: number
}

export function useETHPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/eth-price')
        if (!response.ok) {
          throw new Error('Failed to fetch ETH price')
        }
        const data: ETHPriceData = await response.json()
        setPrice(data.price)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        // Fallback to a default price if API fails (e.g., 3000 USD)
        setPrice(3000)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return { price, loading, error }
}

