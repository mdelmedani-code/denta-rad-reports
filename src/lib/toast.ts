import { toast as sonnerToast } from 'sonner';

/**
 * Standardized toast utility for consistent notifications across the app
 */
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, description ? { description } : undefined);
  },
  
  error: (message: string, description?: string) => {
    sonnerToast.error(message, description ? { description } : undefined);
  },
  
  info: (message: string, description?: string) => {
    sonnerToast.info(message, description ? { description } : undefined);
  },
  
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, description ? { description } : undefined);
  },
  
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },
  
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};
