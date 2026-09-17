import type { SupabaseClient } from '@supabase/supabase-js'
import { DataError, createAbortError, dataErrorFromStatus } from '@/data/errors'
import { getSupabaseClient } from '@/data/supabase/client'

function errorName(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: unknown }).name
    if (typeof name === 'string') {
      return name
    }
  }
  return ''
}

function normalizeInvokeError(error: unknown, response: Response | undefined): DataError {
  const name = errorName(error)

  if (name === 'FunctionsFetchError') {
    return new DataError('network')
  }
  if (name === 'FunctionsRelayError') {
    return new DataError('upstreamError')
  }
  if (name === 'SyntaxError') {
    return new DataError('invalidResponse')
  }
  if (response && typeof response.status === 'number') {
    return dataErrorFromStatus(response.status)
  }

  return new DataError('internalError')
}

export async function invokeRawgProxy(path: string, signal?: AbortSignal): Promise<unknown> {
  let client: SupabaseClient
  try {
    client = getSupabaseClient()
  } catch {
    throw new DataError('internalError')
  }

  const { data, error, response } = await client.functions.invoke<unknown>(path, {
    method: 'GET',
    signal,
  })

  if (error) {
    if (signal?.aborted) {
      throw createAbortError()
    }
    throw normalizeInvokeError(error, response)
  }

  return data
}
