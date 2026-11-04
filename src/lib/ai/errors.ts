export type ProviderErrorCode = 'auth' | 'rate_limited' | 'timeout' | 'network' | 'upstream' | 'invalid' | 'model_unavailable';

export class ProviderError extends Error {
  constructor(readonly code: ProviderErrorCode, message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}
