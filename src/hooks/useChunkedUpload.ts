import { useState, useRef, useCallback } from 'react'
import * as tus from 'tus-js-client'
import { supabase } from '@/integrations/supabase/client'
import { throttle } from 'lodash'

export interface UploadProgress {
  percentage: number
  uploadedMB: number
  totalMB: number
  speedMBps: number
  etaSeconds: number
  bytesUploaded: number
  bytesTotal: number
}

export interface UseChunkedUploadOptions {
  bucketName: string
  onProgress?: (progress: UploadProgress) => void
  onSuccess?: (filePath: string) => void
  onError?: (error: Error) => void
}

export function useChunkedUpload(options: UseChunkedUploadOptions) {
  const { bucketName, onProgress, onSuccess, onError } = options
  
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({
    percentage: 0,
    uploadedMB: 0,
    totalMB: 0,
    speedMBps: 0,
    etaSeconds: 0,
    bytesUploaded: 0,
    bytesTotal: 0,
  })

  const uploadRef = useRef<tus.Upload | null>(null)
  const startTimeRef = useRef<number>(0)

  const updateProgress = useCallback(
    throttle((progressData: UploadProgress) => {
      setProgress(progressData)
      onProgress?.(progressData)
    }, 100), // Update UI every 100ms
    [onProgress]
  )

  const upload = async (file: File | Blob, filePath: string) => {
    setUploading(true)
    startTimeRef.current = Date.now()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      return new Promise<string>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://swusayoygknritombbwg.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${token}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: bucketName,
            objectName: filePath,
            contentType: file.type || 'application/zip',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunks
          onError: (error) => {
            console.error('Upload error:', error)
            setUploading(false)
            onError?.(error)
            reject(error)
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100
            const uploadedMB = bytesUploaded / (1024 * 1024)
            const totalMB = bytesTotal / (1024 * 1024)

            // Calculate speed
            const now = Date.now()
            const elapsed = (now - startTimeRef.current) / 1000 // seconds
            const speed = elapsed > 0 ? bytesUploaded / elapsed : 0 // bytes per second
            const speedMBps = speed / (1024 * 1024)

            // Calculate ETA
            const remainingBytes = bytesTotal - bytesUploaded
            const etaSeconds = speed > 0 ? Math.max(0, Math.ceil(remainingBytes / speed)) : 0

            updateProgress({
              percentage: Math.min(percentage, 100),
              uploadedMB: parseFloat(uploadedMB.toFixed(1)),
              totalMB: parseFloat(totalMB.toFixed(1)),
              speedMBps: parseFloat(speedMBps.toFixed(1)),
              etaSeconds: etaSeconds,
              bytesUploaded,
              bytesTotal,
            })
          },
          onSuccess: () => {
            console.log('Upload complete!')
            setUploading(false)
            onSuccess?.(filePath)
            resolve(filePath)
          },
        })

        uploadRef.current = upload
        upload.start()
      })
    } catch (error) {
      setUploading(false)
      onError?.(error as Error)
      throw error
    }
  }

  const cancel = () => {
    if (uploadRef.current) {
      uploadRef.current.abort()
      setUploading(false)
    }
  }

  return {
    upload,
    cancel,
    uploading,
    progress,
  }
}
