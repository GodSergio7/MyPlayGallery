import { QueryClient } from '@tanstack/react-query'
import { DataError } from '@/data/errors'

const MAX_RETRIES = 2

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false
  }
  if (error instanceof DataError) {
    return (
      error.kind === 'network' ||
      error.kind === 'upstreamError' ||
      error.kind === 'timeout' ||
      error.kind === 'rateLimited'
    )
  }
  return false
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  })
}
