export type DataErrorKind =
  | 'badRequest'
  | 'notFound'
  | 'unauthorized'
  | 'rateLimited'
  | 'upstreamError'
  | 'timeout'
  | 'network'
  | 'invalidResponse'
  | 'internalError'

const DEFAULT_MESSAGES: Record<DataErrorKind, string> = {
  badRequest: 'La petición no es válida.',
  notFound: 'No se ha encontrado el recurso solicitado.',
  unauthorized: 'No se ha podido acceder a los datos.',
  rateLimited: 'Demasiadas peticiones. Inténtalo más tarde.',
  upstreamError: 'No se ha podido obtener la información.',
  timeout: 'La petición ha tardado demasiado.',
  network: 'Sin conexión. Revisa tu red.',
  invalidResponse: 'Los datos recibidos no son válidos.',
  internalError: 'Ha ocurrido un error inesperado.',
}

export class DataError extends Error {
  readonly kind: DataErrorKind

  constructor(kind: DataErrorKind, message?: string) {
    super(message ?? DEFAULT_MESSAGES[kind])
    this.name = 'DataError'
    this.kind = kind
  }
}

export function isDataError(value: unknown): value is DataError {
  return value instanceof DataError
}

export function dataErrorFromStatus(status: number): DataError {
  switch (status) {
    case 400:
    case 405:
      return new DataError('badRequest')
    case 401:
    case 403:
      return new DataError('unauthorized')
    case 404:
      return new DataError('notFound')
    case 429:
      return new DataError('rateLimited')
    case 500:
      return new DataError('internalError')
    case 502:
      return new DataError('upstreamError')
    case 504:
      return new DataError('timeout')
    default:
      return status >= 500 ? new DataError('upstreamError') : new DataError('internalError')
  }
}

export function createAbortError(): Error {
  const error = new Error('La operación se ha cancelado.')
  error.name = 'AbortError'
  return error
}

export function isAbortError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name?: unknown }).name === 'AbortError'
  )
}

export function errorMessage(error: unknown): string {
  return isDataError(error) ? error.message : DEFAULT_MESSAGES.internalError
}
