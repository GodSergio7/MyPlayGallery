import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useAsync<T>(
  task: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)

  const taskRef = useRef(task)

  useEffect(() => {
    taskRef.current = task
  }, [task])

  const requestKey = JSON.stringify([...deps, nonce])
  const [previousKey, setPreviousKey] = useState(requestKey)

  if (previousKey !== requestKey) {
    setPreviousKey(requestKey)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    let active = true

    taskRef
      .current()
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause : new Error(String(cause)))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [requestKey])

  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  return { data, loading, error, reload }
}
