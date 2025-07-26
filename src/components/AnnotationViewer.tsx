import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText, FabricImage, util } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Ruler, 
  Save, 
  Undo, 
  Redo, 
  Trash2,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AnnotationViewerProps {
  caseId: string;
  imageUrl: string;
  className?: string;
}

type AnnotationTool = "select" | "draw" | "rectangle" | "circle" | "text" | "measurement";

interface SavedAnnotation {
  id: string;
  annotation_type: string;
  annotation_data: any;
  created_by: string;
  created_at: string;
}

export const AnnotationViewer = ({ caseId, imageUrl, className = "" }: AnnotationViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#ff0000");
  const [annotations, setAnnotations] = useState<SavedAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#000000",
    });

    // Load background image
    if (imageUrl) {
      FabricImage.fromURL(imageUrl).then((img) => {
        if (!img.width || !img.height) return;
        
        // Scale image to fit canvas
        const scaleX = canvas.width! / img.width;
        const scaleY = canvas.height! / img.height;
        const scale = Math.min(scaleX, scaleY);
        
        img.scale(scale);
        img.set({
          left: (canvas.width! - img.width! * scale) / 2,
          top: (canvas.height! - img.height! * scale) / 2,
          selectable: false,
          evented: false,
        });
        
        canvas.backgroundImage = img;
        canvas.renderAll();
        setIsLoading(false);
      }).catch((error) => {
        console.error('Error loading image:', error);
        setIsLoading(false);
      });
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  // Load saved annotations
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const { data, error } = await supabase
          .from('case_annotations')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setAnnotations(data || []);
        
        // Load annotations onto canvas
        if (fabricCanvas && data) {
          data.forEach((annotation) => {
            if (annotation.annotation_data && typeof annotation.annotation_data === 'object') {
              fabricCanvas.loadFromJSON(annotation.annotation_data, () => {
                fabricCanvas.renderAll();
              });
            }
          });
        }
      } catch (error) {
        console.error('Error loading annotations:', error);
        toast({
          title: "Error",
          description: "Failed to load annotations",
          variant: "destructive",
        });
      }
    };

    if (caseId && fabricCanvas && !isLoading) {
      loadAnnotations();
    }
  }, [caseId, fabricCanvas, isLoading, toast]);

  // Handle tool changes
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 3;
    }

    // Reset selection mode for other tools
    if (activeTool !== "select") {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject((obj) => {
        obj.selectable = false;
      });
    } else {
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject((obj) => {
        obj.selectable = true;
      });
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const handleToolClick = useCallback((tool: AnnotationTool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: 2,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(rect);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: 2,
        radius: 50,
      });
      fabricCanvas.add(circle);
    } else if (tool === "text") {
      const text = new IText('Click to edit', {
        left: 100,
        top: 100,
        fill: activeColor,
        fontSize: 20,
        fontFamily: 'Arial',
      });
      fabricCanvas.add(text);
    } else if (tool === "measurement") {
      // Create a line for measurement
      const line = new Line([100, 100, 200, 100], {
        stroke: activeColor,
        strokeWidth: 2,
        selectable: true,
      });
      
      // Add measurement text
      const distance = Math.sqrt(Math.pow(200 - 100, 2) + Math.pow(100 - 100, 2));
      const text = new IText(`${distance.toFixed(1)} px`, {
        left: 150,
        top: 80,
        fill: activeColor,
        fontSize: 14,
        backgroundColor: 'rgba(255,255,255,0.8)',
      });
      
      fabricCanvas.add(line, text);
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, activeColor]);

  const saveAnnotations = useCallback(async () => {
    if (!fabricCanvas || !user) return;

    setIsSaving(true);
    try {
      const canvasData = fabricCanvas.toJSON();
      
      const { error } = await supabase
        .from('case_annotations')
        .insert({
          case_id: caseId,
          created_by: user.id,
          annotation_data: canvasData,
          annotation_type: 'canvas',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Annotations saved successfully",
      });
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast({
        title: "Error",
        description: "Failed to save annotations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [fabricCanvas, caseId, user, toast]);

  const clearCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    // Reload background image
    if (imageUrl) {
      FabricImage.fromURL(imageUrl).then((img) => {
        if (!img.width || !img.height) return;
        
        const scaleX = fabricCanvas.width! / img.width;
        const scaleY = fabricCanvas.height! / img.height;
        const scale = Math.min(scaleX, scaleY);
        
        img.scale(scale);
        img.set({
          left: (fabricCanvas.width! - img.width! * scale) / 2,
          top: (fabricCanvas.height! - img.height! * scale) / 2,
          selectable: false,
          evented: false,
        });
        
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      }).catch((error) => {
        console.error('Error reloading image:', error);
      });
    }
  }, [fabricCanvas, imageUrl]);

  const toggleAnnotations = useCallback(() => {
    if (!fabricCanvas) return;
    
    const newVisibility = !showAnnotations;
    setShowAnnotations(newVisibility);
    
    fabricCanvas.forEachObject((obj) => {
      obj.visible = newVisibility;
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas, showAnnotations]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading viewer...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Medical Image Viewer</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{annotations.length} annotations</Badge>
            <Button
              onClick={saveAnnotations}
              disabled={isSaving}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("select")}
          >
            Select
          </Button>
          <Button
            variant={activeTool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("draw")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("rectangle")}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("circle")}
          >
            <CircleIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("text")}
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "measurement" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("measurement")}
          >
            <Ruler className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <input
            type="color"
            value={activeColor}
            onChange={(e) => setActiveColor(e.target.value)}
            className="w-8 h-8 rounded border"
            title="Select color"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAnnotations}
          >
            {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden border"
        >
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Use the tools above to annotate the medical image. Your annotations will be visible to clinicians and can be saved for future reference.</p>
        </div>
      </CardContent>
    </Card>
  );
};