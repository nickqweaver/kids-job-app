import { useState, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'

type MutationStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseMutationOptions<TData, TError, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
  ) => void
  /** Whether to call router.invalidate() on success. Default: true */
  invalidateOnSuccess?: boolean
}

interface UseMutationResult<TData, TError, TVariables> {
  /** Fire-and-forget mutation - errors are caught internally */
  mutate: (variables: TVariables) => void
  /** Async mutation - throws on error */
  mutateAsync: (variables: TVariables) => Promise<TData>
  /** The data returned from the mutation */
  data: TData | undefined
  /** The error if the mutation failed */
  error: TError | null
  /** Current status of the mutation */
  status: MutationStatus
  /** True when status is 'idle' */
  isIdle: boolean
  /** True when status is 'loading' */
  isLoading: boolean
  /** True when status is 'success' */
  isSuccess: boolean
  /** True when status is 'error' */
  isError: boolean
  /** Reset the mutation state to idle */
  reset: () => void
}

/**
 * Custom mutation hook for server function calls.
 * Tracks loading, error, and success states.
 * Automatically invalidates router data on success.
 *
 * @example
 * ```tsx
 * const createChore = useMutation(
 *   (data: CreateChoreInput) => createChoreTemplate({ data }),
 *   { onSuccess: () => toast.success('Chore created!') }
 * )
 *
 * // In JSX:
 * <Button
 *   onClick={() => createChore.mutate({ name: 'Clean room', ... })}
 *   disabled={createChore.isLoading}
 * >
 *   {createChore.isLoading ? 'Creating...' : 'Create Chore'}
 * </Button>
 * ```
 */
export function useMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TError, TVariables> = {},
): UseMutationResult<TData, TError, TVariables> {
  const router = useRouter()
  const [status, setStatus] = useState<MutationStatus>('idle')
  const [data, setData] = useState<TData | undefined>(undefined)
  const [error, setError] = useState<TError | null>(null)

  const { onSuccess, onError, onSettled, invalidateOnSuccess = true } = options

  const reset = useCallback(() => {
    setStatus('idle')
    setData(undefined)
    setError(null)
  }, [])

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setStatus('loading')
      setError(null)

      try {
        const result = await mutationFn(variables)
        setData(result)
        setStatus('success')

        if (invalidateOnSuccess) {
          router.invalidate()
        }

        onSuccess?.(result, variables)
        onSettled?.(result, null, variables)

        return result
      } catch (err) {
        const typedError = err as TError
        setError(typedError)
        setStatus('error')

        onError?.(typedError, variables)
        onSettled?.(undefined, typedError, variables)

        throw err
      }
    },
    [mutationFn, router, invalidateOnSuccess, onSuccess, onError, onSettled],
  )

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Error is already handled and stored in state
      })
    },
    [mutateAsync],
  )

  return {
    mutate,
    mutateAsync,
    data,
    error,
    status,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset,
  }
}
