import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2, ZoomIn } from 'lucide-react';

interface ImageData {
  id: string;
  image_url: string;
  caption: string;
  position: number;
}

interface ImageAttachmentProps {
  reportId: string;
  caseId: string;
  section: string;
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  disabled?: boolean;
}

export const ImageAttachment = ({
  reportId,
  caseId,
  section,
  images,
  onImagesChange,
  disabled,
}: ImageAttachmentProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [caption, setCaption] = useState('');
  const { toast } = useToast();

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadedImages: ImageData[] = [];

      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${caseId}/${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('report-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create a signed URL since the bucket is private
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('report-images')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

        if (signedUrlError) throw signedUrlError;
        const imageUrl = signedUrlData.signedUrl;

        const { data: imageData, error: dbError } = await supabase
          .from('report_images')
          .insert({
            report_id: reportId,
            case_id: caseId,
            image_url: imageUrl,
            caption: '',
            position: images.length + uploadedImages.length,
            section,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedImages.push(imageData);
      }

      onImagesChange([...images, ...uploadedImages]);

      toast({
        title: 'Images Uploaded',
        description: `${uploadedImages.length} image(s) uploaded successfully`,
      });

      setShowDialog(false);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    disabled: disabled || uploading,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpdateCaption = async (imageId: string, newCaption: string) => {
    try {
      const { error } = await supabase
        .from('report_images')
        .update({ caption: newCaption })
        .eq('id', imageId);

      if (error) throw error;

      const updatedImages = images.map(img =>
        img.id === imageId ? { ...img, caption: newCaption } : img
      );
      onImagesChange(updatedImages);

      toast({
        title: 'Caption Updated',
        description: 'Image caption saved',
      });
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update caption',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('report-images') + 1).join('/');

      // Delete from storage
      await supabase.storage.from('report-images').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('report_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      onImagesChange(images.filter(img => img.id !== imageId));

      toast({
        title: 'Image Removed',
        description: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to remove image',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Attached Images ({images.length})</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={disabled}
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Images
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted group">
                <img
                  src={image.image_url}
                  alt={image.caption || `Figure ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => {
                    setSelectedImage(image);
                    setCaption(image.caption);
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {!disabled && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(image.id, image.image_url);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="p-2">
                <Input
                  placeholder={`Figure ${index + 1} caption...`}
                  value={image.caption}
                  onChange={(e) => {
                    const updatedImages = images.map(img =>
                      img.id === image.id ? { ...img, caption: e.target.value } : img
                    );
                    onImagesChange(updatedImages);
                  }}
                  onBlur={() => handleUpdateCaption(image.id, image.caption)}
                  disabled={disabled}
                  className="text-xs"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
          </DialogHeader>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary'}
            `}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading images...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop images here or click to select</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG, JPEG, GIF, WEBP (max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh]">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-muted rounded-lg">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.caption}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter caption..."
                  disabled={disabled}
                />
              </div>
              {!disabled && (
                <Button
                  onClick={() => {
                    handleUpdateCaption(selectedImage.id, caption);
                    setSelectedImage(null);
                  }}
                  className="w-full"
                >
                  Save Caption
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};