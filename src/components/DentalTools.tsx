import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Brain, 
  Zap, 
  Wind, 
  Bone, 
  Activity, 
  Target, 
  Route,
  Gauge,
  Heart,
  Stethoscope,
  Microscope,
  ArrowLeftRight
} from "lucide-react";

interface DentalToolsProps {
  onToolActivate: (tool: string) => void;
  activeTool: string;
}

export const DentalTools = ({ onToolActivate, activeTool }: DentalToolsProps) => {
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});

  const handleDentalTool = (toolName: string, description: string) => {
    onToolActivate(toolName);
    
    // Simulate analysis results for demo
    setTimeout(() => {
      const mockResults = generateMockResults(toolName);
      setAnalysisResults(prev => ({ ...prev, [toolName]: mockResults }));
      toast.success(`${description} analysis complete`);
    }, 2000);
  };

  const generateMockResults = (toolName: string) => {
    switch (toolName) {
      case 'ian_nerve':
        return {
          leftNerve: { length: "24.3mm", proximity: "2.1mm to #30" },
          rightNerve: { length: "23.8mm", proximity: "1.9mm to #31" },
          risk: "Low",
          recommendations: "Standard implant protocol suitable"
        };
      case 'tmj_analysis':
        return {
          leftJoint: { condylePosition: "Centered", discPosition: "Normal" },
          rightJoint: { condylePosition: "Slight anterior", discPosition: "Mild displacement" },
          arthrosis: "Grade 1 (mild)",
          recommendations: "Monitor right TMJ, consider conservative treatment"
        };
      case 'airway':
        return {
          volume: "18,500 mm³",
          minCrossSection: "4.2 cm² at C3 level",
          restriction: "Mild narrowing detected",
          recommendations: "Consider sleep study evaluation"
        };
      case 'sinus_analysis':
        return {
          maxillaryLeft: { volume: "14.2 mL", pathology: "Clear" },
          maxillaryRight: { volume: "13.8 mL", pathology: "Mild mucosal thickening" },
          recommendations: "Monitor right sinus, consider ENT consultation"
        };
      default:
        return { status: "Analysis complete", findings: "Normal anatomy detected" };
    }
  };

  const dentalTools = [
    {
      id: 'ian_nerve',
      name: 'IAN Nerve Tracing',
      icon: Route,
      color: 'text-blue-400',
      description: 'Inferior Alveolar Nerve pathway analysis for implant planning',
      price: '£50 each side'
    },
    {
      id: 'tmj_analysis',
      name: 'TMJ Analysis',
      icon: Bone,
      color: 'text-green-400',
      description: 'Temporomandibular joint assessment and dysfunction evaluation',
      price: '£100'
    },
    {
      id: 'airway',
      name: 'Airway Assessment',
      icon: Wind,
      color: 'text-purple-400',
      description: 'Upper airway volume and obstruction analysis',
      price: '£75'
    },
    {
      id: 'sinus_analysis',
      name: 'Sinus Analysis',
      icon: Brain,
      color: 'text-orange-400',
      description: 'Maxillary sinus evaluation for implant planning',
      price: '£60'
    },
    {
      id: 'implant_planning',
      name: 'Implant Planning',
      icon: Target,
      color: 'text-red-400',
      description: 'Precise implant placement planning with measurements',
      price: '£125'
    },
    {
      id: 'orthodontic',
      name: 'Orthodontic Analysis',
      icon: ArrowLeftRight,
      color: 'text-cyan-400',
      description: 'Cephalometric analysis and treatment planning',
      price: '£85'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Dental-Specific Analysis Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dentalTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            const hasResults = analysisResults[tool.id];
            
            return (
              <div key={tool.id} className="space-y-2">
                <Button
                  variant={isActive ? "default" : "outline"}
                  className={`w-full h-auto p-3 flex flex-col items-start gap-2 ${
                    isActive ? "bg-primary" : "hover:bg-muted"
                  }`}
                  onClick={() => handleDentalTool(tool.id, tool.name)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className={`h-4 w-4 ${tool.color}`} />
                    <span className="text-sm font-medium">{tool.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {tool.price}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    {tool.description}
                  </p>
                </Button>
                
                {hasResults && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Analysis Results</span>
                    </div>
                    <div className="text-xs space-y-1">
                      {Object.entries(hasResults).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Microscope className="h-4 w-4" />
            Advanced Analysis Features
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 justify-start"
              onClick={() => handleDentalTool('pathology_screening', 'Pathology Screening')}
            >
              <Gauge className="h-4 w-4 text-yellow-500" />
              <div className="text-left">
                <div className="text-sm">Pathology Screening</div>
                <div className="text-xs text-muted-foreground">AI-powered anomaly detection</div>
              </div>
              <Badge className="ml-auto">£60</Badge>
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 justify-start"
              onClick={() => handleDentalTool('bone_density', 'Bone Density Analysis')}
            >
              <Heart className="h-4 w-4 text-pink-500" />
              <div className="text-left">
                <div className="text-sm">Bone Density Analysis</div>
                <div className="text-xs text-muted-foreground">Hounsfield unit mapping</div>
              </div>
              <Badge className="ml-auto">£70</Badge>
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                Professional CBCT Analysis
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                All analyses are performed using advanced 3D reconstruction algorithms and validated 
                measurement protocols. Results include detailed reports suitable for treatment planning.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};