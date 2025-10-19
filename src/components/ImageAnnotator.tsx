import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, FabricText, FabricImage, Line } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  MousePointer2, 
  Pencil, 
  Circle as CircleIcon, 
  Type, 
  Trash2, 
  Download,
  Undo,
  Redo,
  ArrowRight,
  Upload,
  Save
} from "lucide-react";
import { toast } from "sonner";

interface ImageAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedImageBlob: Blob, originalFileName: string) => void;
  fileName: string;
}

type AnnotationTool = "select" | "pen" | "circle" | "arrow" | "text";

const PRESET_COLORS = [
  "#ff0000", // red
  "#0000ff", // blue
  "#00ff00", // green
  "#ffff00", // yellow
  "#9333ea", // purple
  "#ffffff", // white
  "#000000", // black
];

export const ImageAnnotator = ({ imageUrl, onSave, fileName }: ImageAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#ff0000");
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [brushWidth, setBrushWidth] = useState(3);
  const [opacity, setOpacity] = useState(100);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

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

      // Save initial state to history
      setTimeout(() => {
        saveToHistory(canvas);
      }, 100);

      setFabricCanvas(canvas);
      toast.success("Image loaded! Start annotating.");
    };

    img.onerror = () => {
      toast.error("Failed to load image");
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

  // Configure drawing mode and brush
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "pen";
    
    if (fabricCanvas.freeDrawingBrush) {
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      
      fabricCanvas.freeDrawingBrush.color = hexToRgba(activeColor, opacity / 100);
      fabricCanvas.freeDrawingBrush.width = brushWidth;
    }
    
    fabricCanvas.renderAll();
  }, [activeTool, activeColor, brushWidth, opacity, fabricCanvas]);

  // Save to history after object added/modified
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectAdded = () => {
      saveToHistory(fabricCanvas);
    };

    const handleObjectModified = () => {
      saveToHistory(fabricCanvas);
    };

    fabricCanvas.on('object:added', handleObjectAdded);
    fabricCanvas.on('object:modified', handleObjectModified);

    return () => {
      fabricCanvas.off('object:added', handleObjectAdded);
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, [fabricCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'p': setActiveTool('pen'); break;
          case 'c': setActiveTool('circle'); break;
          case 'a': setActiveTool('arrow'); break;
          case 't': setActiveTool('text'); setShowTextInput(true); break;
          case 'delete':
          case 'backspace':
            handleDeleteSelected();
            e.preventDefault();
            break;
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        handleUndo();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, historyStep, history]);

  const saveToHistory = (canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      return newHistory;
    });
    setHistoryStep(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyStep <= 0 || !fabricCanvas) return;
    
    const newStep = historyStep - 1;
    setHistoryStep(newStep);
    
    const state = history[newStep];
    fabricCanvas.loadFromJSON(state, () => {
      fabricCanvas.renderAll();
    });
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1 || !fabricCanvas) return;
    
    const newStep = historyStep + 1;
    setHistoryStep(newStep);
    
    const state = history[newStep];
    fabricCanvas.loadFromJSON(state, () => {
      fabricCanvas.renderAll();
    });
  };

  const handleToolClick = (tool: AnnotationTool) => {

    setActiveTool(tool);
    setShowTextInput(tool === "text");

    if (!fabricCanvas) return;

    if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: brushWidth,
        radius: 50,
        opacity: opacity / 100,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      setActiveTool("select");
    } else if (tool === "arrow") {
      const arrow = new Line([100, 100, 200, 100], {
        stroke: activeColor,
        strokeWidth: brushWidth,
        opacity: opacity / 100,
      });
      fabricCanvas.add(arrow);
      fabricCanvas.setActiveObject(arrow);
      setActiveTool("select");
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
    
    if (!confirm("Are you sure you want to clear all annotations?")) return;
    
    // Remove all objects except the background image
    const objects = fabricCanvas.getObjects().filter(obj => obj !== fabricCanvas.backgroundImage);
    fabricCanvas.remove(...objects);
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    toast.success("Annotations cleared!");
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
      toast.success("Annotated image saved!");
    } catch (error) {
      console.error("Error saving annotated image:", error);
      toast.error("Failed to save annotated image");
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
    toast.success("Image downloaded!");
  };

  const handleImportImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !fabricCanvas) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const fabricImg = new FabricImage(img, {
            left: 50,
            top: 50,
            scaleX: 0.5,
            scaleY: 0.5,
          });
          fabricCanvas.add(fabricImg);
          fabricCanvas.renderAll();
          toast.success("Image imported!");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Annotation Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tool Buttons Grid - Simplified to 4 Essential Tools */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Annotation Tools</Label>
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("select")}
                title="Select Tool (V)"
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <MousePointer2 className="w-4 h-4" />
                <span className="text-xs">Select</span>
              </Button>
              
              <Button
                variant={activeTool === "pen" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("pen")}
                title="Pen Tool (P) - Freehand drawing"
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Pencil className="w-4 h-4" />
                <span className="text-xs">Pen</span>
              </Button>

              <Button
                variant={activeTool === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("circle")}
                title="Circle Tool (C) - Highlight areas"
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <CircleIcon className="w-4 h-4" />
                <span className="text-xs">Circle</span>
              </Button>

              <Button
                variant={activeTool === "arrow" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("arrow")}
                title="Arrow Tool (A) - Point to findings"
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="text-xs">Arrow</span>
              </Button>

              <Button
                variant={activeTool === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("text")}
                title="Text Tool (T) - Add labels"
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Type className="w-4 h-4" />
                <span className="text-xs">Text</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 For complex measurements and 3D annotations, use OsiriX/Horos before uploading
            </p>
          </div>

          <Separator />

          {/* Color Palette */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Color Palette</Label>
            <div className="flex gap-2 items-center flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    activeColor === color ? 'border-primary scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                  title={color}
                />
              ))}
              <Input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="w-12 h-8 p-1 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          <Separator />

          {/* Brush Width Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Brush Width: {brushWidth}px
            </Label>
            <Slider
              min={1}
              max={20}
              step={1}
              value={[brushWidth]}
              onValueChange={(values) => setBrushWidth(values[0])}
              className="w-full"
            />
          </div>

          {/* Opacity Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Opacity: {opacity}%
            </Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[opacity]}
              onValueChange={(values) => setOpacity(values[0])}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4 mr-1" />
              Undo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyStep >= history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4 mr-1" />
              Redo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              title="Delete selected (Del)"
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

            <Button
              variant="outline"
              size="sm"
              onClick={handleImportImage}
            >
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
          </div>

          <Separator />

          {/* Text Input */}
          {showTextInput && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter text to add..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleAddText} disabled={!textInput.trim()}>
                Add Text
              </Button>
            </div>
          )}

          {/* Save/Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save to Report
            </Button>
            
            <Button variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="border border-border rounded-lg overflow-hidden bg-white shadow-lg">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>

      {/* Keyboard Shortcuts Help */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Keyboard Shortcuts:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div><kbd className="px-1 py-0.5 bg-muted rounded">V</kbd> Select</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">P</kbd> Pen</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">C</kbd> Circle</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">A</kbd> Arrow</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">T</kbd> Text</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Del</kbd> Delete</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Z</kbd> Undo</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Y</kbd> Redo</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};