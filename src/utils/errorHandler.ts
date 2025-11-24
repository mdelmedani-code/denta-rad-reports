import { toast } from '@/lib/toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: any, fallbackMessage?: string) => {
  console.error('[Error]', error);

  let message = fallbackMessage || 'An unexpected error occurred';
  let description: string | undefined;

  if (error instanceof AppError) {
    message = error.message;
    description = error.details?.message;
  } else if (error?.message) {
    description = error.message;
  } else if (typeof error === 'string') {
    description = error;
  }

  toast.error(message, description);
};

export const handleAsyncError = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    handleError(error, errorMessage);
    return null;
  }
};
