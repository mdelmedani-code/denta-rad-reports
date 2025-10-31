import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Image as ImageIcon } from 'lucide-react';
import { ImageGallery } from '@/components/ImageGallery';

interface ImageGalleryCardProps {
  reportId: string;
}

export function ImageGalleryCard({ reportId }: ImageGalleryCardProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, [reportId]);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('report_images')
        .select('*')
        .eq('report_id', reportId)
        .order('position');

      if (error) throw error;

      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Report Images ({images.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading images...
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No images attached to this report</p>
          </div>
        ) : (
          <ImageGallery images={images} />
        )}
      </CardContent>
    </Card>
  );
}
