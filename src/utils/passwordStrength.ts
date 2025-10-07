export interface PasswordStrength {
  valid: boolean;
  score: number; // 0-4
  feedback: string[];
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const feedback: string[] = [];
  let score = 0;

  // Minimum length: 12 characters (NHS Digital requirement)
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  } else {
    score++;
    if (password.length >= 16) {
      score++;
      feedback.push('Excellent length');
    }
  }

  // Character complexity requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUppercase) errors.push('Include at least one uppercase letter');
  if (!hasLowercase) errors.push('Include at least one lowercase letter');
  if (!hasNumber) errors.push('Include at least one number');
  if (!hasSpecial) errors.push('Include at least one special character (!@#$%^&* etc.)');

  const complexityCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  if (complexityCount >= 4) {
    score++;
    feedback.push('Good character variety');
  }

  // Check for common patterns
  const commonPatterns = [
    /123+/i,
    /abc+/i,
    /qwerty/i,
    /password/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i,
    /\b(\w+)\1+\b/i, // Repeated words
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns or words');
      score = Math.max(0, score - 1);
      break;
    }
  }

  // Check for sequential characters
  const sequences = [
    '01234567890',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];

  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const substr = seq.substring(i, i + 4);
      const reverseSubstr = substr.split('').reverse().join('');
      
      if (password.toLowerCase().includes(substr) || password.toLowerCase().includes(reverseSubstr)) {
        feedback.push('Avoid sequential characters');
        break;
      }
    }
  }

  // Final score adjustment
  if (errors.length === 0 && complexityCount === 4 && password.length >= 16) {
    score = 4;
  }

  return {
    valid: errors.length === 0,
    score: Math.min(4, Math.max(0, score)),
    feedback,
    errors
  };
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'text-destructive';
    case 2:
      return 'text-orange-600';
    case 3:
      return 'text-yellow-600';
    case 4:
      return 'text-green-600';
    default:
      return 'text-muted-foreground';
  }
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}
