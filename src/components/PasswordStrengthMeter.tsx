import { validatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '@/utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const strength = validatePasswordStrength(password);

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      {password && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Password Strength:</span>
            <span className={`text-xs font-semibold ${getPasswordStrengthColor(strength.score)}`}>
              {getPasswordStrengthLabel(strength.score)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                strength.score === 0 ? 'bg-destructive' :
                strength.score === 1 ? 'bg-destructive' :
                strength.score === 2 ? 'bg-orange-500' :
                strength.score === 3 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements */}
      {showRequirements && (
        <div className="space-y-1">
          {password && strength.errors.length > 0 && (
            <>
              {strength.errors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-destructive mt-0.5">✗</span>
                  <span className="text-destructive">{error}</span>
                </div>
              ))}
            </>
          )}
          
          {password && strength.valid && strength.feedback.length > 0 && (
            <>
              {strength.feedback.map((fb, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span className="text-green-600">{fb}</span>
                </div>
              ))}
            </>
          )}

          {/* Static Requirements List (always shown when no password) */}
          {!password && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Password must include:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>At least 12 characters (16+ recommended)</li>
                <li>Uppercase and lowercase letters</li>
                <li>Numbers</li>
                <li>Special characters (!@#$%^&* etc.)</li>
                <li>No common words or patterns</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
