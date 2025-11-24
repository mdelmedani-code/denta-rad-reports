import { Alert, AlertDescription } from '@/components/ui/alert';
import { PoundSterling } from 'lucide-react';

interface PricingDisplayProps {
  estimatedCost: number | null;
  loading: boolean;
}

export const PricingDisplay = ({ estimatedCost, loading }: PricingDisplayProps) => {
  return (
    <Alert>
      <PoundSterling className="h-4 w-4" />
      <AlertDescription>
        {loading ? (
          'Calculating cost...'
        ) : estimatedCost !== null ? (
          <>
            <strong>Estimated Cost:</strong> £{estimatedCost.toFixed(2)}
          </>
        ) : (
          'Pricing information unavailable'
        )}
      </AlertDescription>
    </Alert>
  );
};
