import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, Loader2, AlertCircle } from "lucide-react";
import { getPACSStudyForCase } from "@/services/pacsService";
import { useToast } from "@/hooks/use-toast";
import type { PACSStudy } from "@/services/pacsService";

interface DicomViewerProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DicomViewer = ({ caseId, isOpen, onClose }: DicomViewerProps) => {
  const [study, setStudy] = useState<PACSStudy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && caseId) {
      loadStudy();
    }
  }, [isOpen, caseId]);

  const loadStudy = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getPACSStudyForCase(caseId);
      
      if (result.success && result.study) {
        setStudy(result.study);
      } else {
        setError(result.error || 'Failed to load study');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load study';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadInstance = async (downloadUrl: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "DICOM file download has started",
      });
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Failed to download DICOM file",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            DICOM Viewer
          </DialogTitle>
          <DialogDescription>
            View and download DICOM images from PACS
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <p>Loading study from PACS...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="w-8 h-8 mr-2" />
            <div>
              <p className="font-semibold">Error loading study</p>
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadStudy}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {study && (
          <div className="space-y-4">
            {/* Study Information */}
            <Card>
              <CardHeader>
                <CardTitle>Study Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Patient:</strong> {study.patientName}</p>
                    <p><strong>Patient ID:</strong> {study.patientID}</p>
                    <p><strong>Study Date:</strong> {study.studyDate}</p>
                  </div>
                  <div>
                    <p><strong>Study Time:</strong> {study.studyTime}</p>
                    <p><strong>Description:</strong> {study.studyDescription}</p>
                    <p><strong>Series Count:</strong> {study.seriesCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Series */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Series ({study.series.length})</h3>
              
              {study.series.map((series) => (
                <Card key={series.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{series.seriesDescription}</span>
                      <Badge variant="secondary">{series.modality}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {series.instanceCount} instances
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Instance Previews */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {series.instances.map((instance) => (
                        <div key={instance.id} className="border rounded-lg p-4">
                          <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                            <img
                              src={instance.previewUrl}
                              alt="DICOM Preview"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjczODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5EaWNvbSBJbWFnZTwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInstance(
                              instance.downloadUrl,
                              `${study.patientName}_${series.seriesDescription}_${instance.id}.dcm`
                            )}
                            className="w-full"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>

                    {series.instanceCount > series.instances.length && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Showing {series.instances.length} of {series.instanceCount} instances.
                          Complete series can be downloaded from PACS.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};