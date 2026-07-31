export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = 'response' in error
      ? (error as { response?: { data?: unknown } }).response
      : undefined;

    if (response?.data && typeof response.data === 'object') {
      const data = response.data as { message?: unknown };
      if (typeof data.message === 'string' && data.message.trim()) {
        return `${fallback} ${data.message}`;
      }
    }

    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return `${fallback} ${(error as { message: string }).message}`;
    }
  }

  return fallback;
}
