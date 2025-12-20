import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileArchive, Loader2 } from 'lucide-react';
import { UploadTimeEstimator } from './UploadTimeEstimator';
interface UploadFormProps {
  formData: {
    patientName: string;
    patientInternalId: string;
    patientDob: string;
    clinicalQuestion: string;
    specialInstructions: string;
    fieldOfView: string;
    urgency: string;
  };
  onFormChange: (data: any) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  zipFile: File | null;
  validating: boolean;
  disabled: boolean;
}

export const UploadForm = ({
  formData,
  onFormChange,
  onFileSelect,
  zipFile,
  validating,
  disabled,
}: UploadFormProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="patientName">
            Patient Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="patientName"
            placeholder="John Smith"
            value={formData.patientName}
            onChange={(e) => onFormChange({ ...formData, patientName: e.target.value })}
            required
            disabled={disabled}
          />
        </div>

        <div>
          <Label htmlFor="patientInternalId">Patient Internal ID</Label>
          <Input
            id="patientInternalId"
            placeholder="Optional clinic reference"
            value={formData.patientInternalId}
            onChange={(e) => onFormChange({ ...formData, patientInternalId: e.target.value })}
            disabled={disabled}
          />
        </div>

        <div>
          <Label htmlFor="patientDob">Date of Birth</Label>
          <Input
            id="patientDob"
            type="date"
            value={formData.patientDob}
            onChange={(e) => onFormChange({ ...formData, patientDob: e.target.value })}
            disabled={disabled}
          />
        </div>

        <div>
          <Label htmlFor="clinicalQuestion">
            Clinical Question <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="clinicalQuestion"
            placeholder="What specific information are you seeking?"
            value={formData.clinicalQuestion}
            onChange={(e) => onFormChange({ ...formData, clinicalQuestion: e.target.value })}
            required
            disabled={disabled}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="specialInstructions">Special Instructions or Questions (Optional)</Label>
          <Textarea
            id="specialInstructions"
            placeholder="Any additional notes, preferences, or questions for the radiologist..."
            value={formData.specialInstructions}
            onChange={(e) => onFormChange({ ...formData, specialInstructions: e.target.value })}
            disabled={disabled}
            rows={2}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Use this to communicate directly with your radiologist
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fieldOfView">Field of View</Label>
            <Select
              value={formData.fieldOfView}
              onValueChange={(value: any) => onFormChange({ ...formData, fieldOfView: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="up_to_5x5">Up to 5×5 cm</SelectItem>
                <SelectItem value="up_to_8x5">Up to 8×5 cm</SelectItem>
                <SelectItem value="up_to_8x8">Up to 8×8 cm</SelectItem>
                <SelectItem value="over_8x8">Over 8×8 cm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="urgency">Urgency</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value: any) => onFormChange({ ...formData, urgency: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (5-7 days)</SelectItem>
                <SelectItem value="urgent">Urgent (24 hours) +50%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="zipFile">
            DICOM Files (ZIP) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="zipFile"
            type="file"
            accept=".zip"
            onChange={onFileSelect}
            required
            disabled={disabled || validating}
          />
          {validating && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating file...
            </div>
          )}
          {zipFile && !validating && (
            <div className="space-y-3 mt-2">
              <p className="text-sm text-green-600 flex items-center gap-2">
                <FileArchive className="w-4 h-4" />
                {zipFile.name} selected
              </p>
              <UploadTimeEstimator fileSize={zipFile.size} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
