import { AxiosError } from 'axios';

/** Base URL for the Gemini (Generative Language) REST API. */
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Transient statuses worth retrying: rate limit, server error, overloaded.
const RETRYABLE_STATUSES = new Set([429, 500, 503]);

// Never sleep longer than this between retries, even if the API asks for more.
const MAX_RETRY_DELAY_MS = 65_000;

/**
 * For 429 responses Google includes the exact wait in the error body
 * (google.rpc.RetryInfo `retryDelay`, e.g. "19.716s") and/or a Retry-After
 * header. Honor it — per-minute quotas need tens of seconds, not the
 * sub-second exponential backoff that suits transient 5xx errors.
 */
function rateLimitDelayMs(error: AxiosError): number | undefined {
  const retryAfter = Number(error.response?.headers?.['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;

  const details = (
    error.response?.data as {
      error?: { details?: Array<{ '@type'?: string; retryDelay?: string }> };
    }
  )?.error?.details;
  const retryInfo = details?.find((d) => d['@type']?.endsWith('RetryInfo'));
  const seconds = Number(retryInfo?.retryDelay?.replace(/s$/, ''));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

/**
 * True for connection-level failures (timeout, reset, aborted write, DNS
 * blip) where the request never got an HTTP response at all — axios sets
 * `.request` but leaves `.response` undefined for these. Distinct from a
 * clean 4xx/5xx: there's no status to branch on, but the failure is just as
 * transient as a 500/503 and worth the same short backoff.
 */
function isNetworkError(error: AxiosError): boolean {
  return Boolean(error.isAxiosError && error.request && !error.response);
}

/**
 * Run a Gemini call with retries on transient failures. 500/503 and bare
 * network errors (timeout/reset/aborted — no HTTP response received) use
 * short exponential backoff; 429 waits for the delay the API advertises
 * (falling back to 30s — free-tier quotas reset per minute). Non-retryable
 * errors (and the final attempt) are rethrown as a clean Gemini error.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const axiosError = error as AxiosError;
      const status = axiosError?.response?.status;
      const retryable =
        (status !== undefined && RETRYABLE_STATUSES.has(status)) ||
        isNetworkError(axiosError);
      if (!retryable || attempt === attempts - 1) break;

      const delayMs =
        status === 429
          ? Math.min(
              (rateLimitDelayMs(error as AxiosError) ?? 30_000) + 1_000,
              MAX_RETRY_DELAY_MS,
            )
          : baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw toGeminiError(lastError);
}

/**
 * Turn a raw axios failure into a concise Error carrying the HTTP status and
 * Google's actual error body, instead of letting the giant axios object bubble
 * up (which buries the useful "model not found / unsupported method" message).
 */
export function toGeminiError(error: unknown): Error {
  const axiosError = error as AxiosError;
  if (axiosError?.isAxiosError) {
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    const detail = body ? JSON.stringify(body) : axiosError.message;
    return new Error(
      `Gemini API error (status ${status ?? 'unknown'}): ${detail}`,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
