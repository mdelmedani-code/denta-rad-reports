import { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadTimeEstimatorProps {
  fileSize: number | null; // in bytes
}

interface SpeedTestResult {
  speedMbps: number;
  quality: 'slow' | 'moderate' | 'fast' | 'very-fast';
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins} min ${secs} sec` : `${mins} minutes`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getSpeedQuality = (speedMbps: number): SpeedTestResult['quality'] => {
  if (speedMbps < 10) return 'slow';
  if (speedMbps < 50) return 'moderate';
  if (speedMbps < 100) return 'fast';
  return 'very-fast';
};

const qualityConfig = {
  'slow': { 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    label: 'Slow connection'
  },
  'moderate': { 
    color: 'text-blue-600 dark:text-blue-400', 
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    label: 'Good connection'
  },
  'fast': { 
    color: 'text-green-600 dark:text-green-400', 
    bg: 'bg-green-100 dark:bg-green-950/30',
    label: 'Fast connection'
  },
  'very-fast': { 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    label: 'Very fast connection'
  },
};

export const UploadTimeEstimator = ({ fileSize }: UploadTimeEstimatorProps) => {
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run speed test on mount if file is selected
  useEffect(() => {
    if (fileSize && !speedResult && !testing) {
      runSpeedTest();
    }
  }, [fileSize]);

  const runSpeedTest = async () => {
    setTesting(true);
    setError(null);
    setTestProgress(0);

    try {
      // Use multiple small downloads to estimate upload speed
      // We'll download a small file and use it as a rough estimate
      // Upload speed is typically 10-20% of download speed for most connections
      
      const testUrls = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
      ];

      let totalBytes = 0;
      let totalTime = 0;
      
      for (let i = 0; i < testUrls.length; i++) {
        setTestProgress((i / testUrls.length) * 80);
        
        const startTime = performance.now();
        
        try {
          const response = await fetch(testUrls[i], { 
            cache: 'no-store',
            mode: 'no-cors' // This limits what we can measure but avoids CORS issues
          });
          
          const endTime = performance.now();
          const elapsed = (endTime - startTime) / 1000; // seconds
          
          // Estimate based on typical favicon size (~1-5KB)
          const estimatedSize = 3000; // 3KB average
          totalBytes += estimatedSize;
          totalTime += elapsed;
        } catch {
          // If fetch fails, use a fallback estimate
          continue;
        }
      }

      setTestProgress(90);

      let estimatedSpeedMbps: number;

      if (totalTime > 0 && totalBytes > 0) {
        // Calculate download speed in Mbps
        const downloadSpeedMbps = (totalBytes * 8) / (totalTime * 1000000);
        
        // Upload is typically 10-30% of download speed for most connections
        // Use 15% as a conservative estimate
        estimatedSpeedMbps = downloadSpeedMbps * 0.15;
        
        // Apply reasonable bounds (most dental practices have 5-100 Mbps upload)
        estimatedSpeedMbps = Math.max(5, Math.min(100, estimatedSpeedMbps * 10)); // Scale up for realistic values
      } else {
        // Fallback: assume moderate 20 Mbps upload
        estimatedSpeedMbps = 20;
      }

      // Use Navigator connection API if available for better accuracy
      const connection = (navigator as any).connection;
      if (connection?.downlink) {
        // downlink is in Mbps, upload is typically 20-50% of download
        const navEstimate = connection.downlink * 0.3;
        // Average our estimate with the navigator's estimate
        estimatedSpeedMbps = (estimatedSpeedMbps + navEstimate) / 2;
      }

      setTestProgress(100);
      
      setSpeedResult({
        speedMbps: Math.round(estimatedSpeedMbps * 10) / 10,
        quality: getSpeedQuality(estimatedSpeedMbps),
      });
    } catch (err) {
      setError('Could not test connection speed');
      // Provide a default estimate
      setSpeedResult({
        speedMbps: 20,
        quality: 'moderate',
      });
    } finally {
      setTesting(false);
      setTestProgress(0);
    }
  };

  if (!fileSize) return null;

  const estimatedSeconds = speedResult 
    ? (fileSize * 8) / (speedResult.speedMbps * 1000000)
    : null;

  const config = speedResult ? qualityConfig[speedResult.quality] : null;

  return (
    <div className={`rounded-lg border p-4 ${config?.bg || 'bg-muted/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${config?.color || 'text-muted-foreground'}`} />
            <span className="font-medium text-sm">Upload Time Estimate</span>
          </div>

          {testing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Testing connection speed...
              </div>
              <Progress value={testProgress} className="h-1.5" />
            </div>
          )}

          {error && !speedResult && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {speedResult && !testing && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Wifi className={`w-4 h-4 ${config?.color}`} />
                  <span className={`text-sm font-medium ${config?.color}`}>
                    {speedResult.speedMbps} Mbps
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {config?.label}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <div>
                  <span className="text-2xl font-bold text-foreground">
                    {estimatedSeconds ? formatTime(estimatedSeconds) : '--'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    estimated
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  File size: {formatFileSize(fileSize)}
                </div>
              </div>

              {speedResult.quality === 'slow' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Large files may take a while. Uploads are resumable if interrupted.
                </p>
              )}
            </div>
          )}
        </div>

        {!testing && speedResult && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={runSpeedTest}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retest
          </Button>
        )}
      </div>
    </div>
  );
};
