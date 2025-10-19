import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  MousePointer, 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Trash2, 
  Download,
  Palette,
  Undo,
  Redo
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedImageBlob: Blob, originalFileName: string) => void;
  fileName: string;
}

export const ImageAnnotator = ({ imageUrl, onSave, fileName }: ImageAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#ff0000");
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "rectangle" | "circle" | "text">("select");
  const [brushWidth, setBrushWidth] = useState(3);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Load the image first
    const img = new Image();
    img.onload = () => {
      const canvas = new FabricCanvas(canvasRef.current!, {
        width: Math.min(img.width, 800),
        height: Math.min(img.height, 600),
        backgroundColor: "#ffffff",
      });

      // Calculate scaling to fit the image in the canvas
      const scaleX = canvas.width! / img.width;
      const scaleY = canvas.height! / img.height;
      const scale = Math.min(scaleX, scaleY);

      // Create fabric image and set as background
      const fabricImg = new FabricImage(img, {
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });

      // Center the image
      fabricImg.set({
        left: (canvas.width! - fabricImg.getScaledWidth()) / 2,
        top: (canvas.height! - fabricImg.getScaledHeight()) / 2,
      });

      canvas.backgroundImage = fabricImg;
      canvas.renderAll();

      // Initialize the freeDrawingBrush properly
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = brushWidth;
      }

      setFabricCanvas(canvas);
      toast({
        title: "Success",
        description: "Image loaded! Start annotating.",
      });
    };

    img.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load image",
        variant: "destructive",
      });
    };

    // Set crossOrigin before src to avoid CORS issues
    img.crossOrigin = "anonymous";
    
    // For Supabase storage URLs, ensure proper CORS handling
    if (imageUrl.includes('supabase.co')) {
      console.log('Loading Supabase image with CORS:', imageUrl);
    }
    
    img.src = imageUrl;

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Configure drawing mode and brush
    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    // Always ensure brush is configured (whether drawing or not)
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushWidth;
    }
    
    // Force canvas refresh to apply changes
    fabricCanvas.renderAll();
  }, [activeTool, activeColor, brushWidth, fabricCanvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);
    setShowTextInput(tool === "text");

    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: brushWidth,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: brushWidth,
        radius: 50,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
    }
  };

  const handleAddText = () => {
    if (!fabricCanvas || !textInput.trim()) return;

    const text = new FabricText(textInput, {
      left: 100,
      top: 100,
      fill: activeColor,
      fontSize: 20,
      fontFamily: "Arial",
    });
    
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    setTextInput("");
    setShowTextInput(false);
    setActiveTool("select");
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvas) return;
    
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length) {
      fabricCanvas.remove(...activeObjects);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Remove all objects except the background image
    const objects = fabricCanvas.getObjects().filter(obj => obj !== fabricCanvas.backgroundImage);
    fabricCanvas.remove(...objects);
    fabricCanvas.renderAll();
    toast({
      title: "Success",
      description: "Annotations cleared!",
    });
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;

    try {
      // Export canvas as blob
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1,
      });

      // Convert data URL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      onSave(blob, fileName);
      toast({
        title: "Success", 
        description: "Annotated image saved!",
      });
    } catch (error) {
      console.error("Error saving annotated image:", error);
      toast({
        title: "Error",
        description: "Failed to save annotated image",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1,
    });

    const link = document.createElement('a');
    link.download = `annotated_${fileName}`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Image Annotation Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Tool Buttons */}
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("select")}
            >
              <MousePointer className="w-4 h-4 mr-1" />
              Select
            </Button>
            
            <Button
              variant={activeTool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("draw")}
            >
              <Pencil className="w-4 h-4 mr-1" />
              Draw
            </Button>

            <Button
              variant={activeTool === "rectangle" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("rectangle")}
            >
              <Square className="w-4 h-4 mr-1" />
              Rectangle
            </Button>

            <Button
              variant={activeTool === "circle" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("circle")}
            >
              <CircleIcon className="w-4 h-4 mr-1" />
              Circle
            </Button>

            <Button
              variant={activeTool === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("text")}
            >
              <Type className="w-4 h-4 mr-1" />
              Text
            </Button>

            <div className="border-l mx-2" />

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              Clear All
            </Button>
          </div>

          {/* Tool Options */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <Input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="w-12 h-8 p-1 border rounded"
              />
              <span className="text-sm text-muted-foreground">Color</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Width:</label>
              <Input
                type="range"
                min="1"
                max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{brushWidth}px</span>
            </div>
          </div>

          {/* Text Input */}
          {showTextInput && (
            <div className="flex gap-2 mt-4">
              <Input
                type="text"
                placeholder="Enter text to add..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
                className="flex-1"
              />
              <Button onClick={handleAddText} disabled={!textInput.trim()}>
                Add Text
              </Button>
            </div>
          )}

          {/* Save Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Save to Report
            </Button>
            
            <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
};