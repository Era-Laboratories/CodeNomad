import { getLogger } from "./logger"

const log = getLogger("api")

/**
 * Helper to unwrap SDK responses with consistent error handling.
 * Throws descriptive errors on failure, returns typed data on success.
 */
export async function requestData<T>(
  promise: Promise<{ data?: T; error?: unknown }>,
  label: string
): Promise<T> {
  const response = await promise
  if (response.error) {
    log.error(`${label} failed:`, response.error)
    throw new Error(`${label} failed`)
  }
  if (response.data === undefined || response.data === null) {
    throw new Error(`${label} returned no data`)
  }
  return response.data
}
