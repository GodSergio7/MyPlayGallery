import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectSteam,
  listConnections,
  removeConnection,
  type ConnectionProvider,
  type PlatformConnection,
} from '@/data/supabase/connectionsRepository'

const CONNECTIONS_KEY = ['connections'] as const

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: listConnections,
  })
}

export function useConnectSteam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: connectSteam,
    onSuccess: (connection) => {
      queryClient.setQueryData<PlatformConnection[]>(CONNECTIONS_KEY, (current = []) => [
        ...current.filter((item) => item.provider !== connection.provider),
        connection,
      ])
    },
  })
}

export function useDisconnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider: ConnectionProvider) => removeConnection(provider),
    onSuccess: (_, provider) => {
      queryClient.setQueryData<PlatformConnection[]>(CONNECTIONS_KEY, (current = []) =>
        current.filter((item) => item.provider !== provider),
      )
    },
  })
}
