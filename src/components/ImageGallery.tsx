import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageData {
  id: string;
  image_url: string;
  caption: string;
  position: number;
}

interface ImageGalleryProps {
  images: ImageData[];
  className?: string;
  showCaptions?: boolean;
}

export const ImageGallery = ({ images, className, showCaptions = true }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
        {images.map((image, index) => (
          <div key={image.id} className="space-y-2">
            <div 
              className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.image_url}
                alt={image.caption || `Figure ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {showCaptions && image.caption && (
              <p className="text-sm text-muted-foreground text-center">
                {image.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {selectedImage && (
              <div className="flex flex-col items-center gap-4 max-w-full max-h-full">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.caption}
                  className="max-w-full max-h-[85vh] object-contain"
                />
                {selectedImage.caption && (
                  <p className="text-white text-center text-lg px-4 py-2 bg-black/60 rounded-lg">
                    {selectedImage.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
