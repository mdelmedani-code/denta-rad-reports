import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Monitor, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface OsiriXConnectionProps {
  caseData: {
    id: string;
    patient_name: string;
    orthanc_study_id: string;
    orthanc_series_id?: string;
    clinical_question: string;
  };
}

export const OsiriXConnection = ({ caseData }: OsiriXConnectionProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!caseData.orthanc_study_id) {
    return (
      <Button variant="outline" disabled className="text-gray-500">
        <Monitor className="w-4 h-4 mr-2" />
        No DICOM Data
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-blue-600 hover:text-blue-700">
          <Monitor className="w-4 h-4 mr-2" />
          Open in OsiriX
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Connect to PACS with OsiriX
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">How to connect:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Open OsiriX on your Mac</li>
              <li>2. Go to <strong>Window → DICOM Query/Retrieve</strong></li>
              <li>3. Click <strong>Add Server</strong> and enter our PACS details</li>
              <li>4. Search for the study using the Study Instance UID below</li>
            </ol>
          </div>

          {/* Patient Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Patient Information</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient Name</label>
                  <p className="text-gray-900">{caseData.patient_name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(caseData.patient_name, 'Patient Name')}
                  className="ml-2"
                >
                  {copiedField === 'Patient Name' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Clinical Question</label>
                  <p className="text-gray-900 text-sm">{caseData.clinical_question}</p>
                </div>
              </div>
            </div>
          </div>

          {/* PACS Connection Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">PACS Server Details</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Server Address</label>
                  <p className="text-gray-900 font-mono">116.203.35.168</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('116.203.35.168', 'Server Address')}
                >
                  {copiedField === 'Server Address' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Port</label>
                  <p className="text-gray-900 font-mono">8042</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('8042', 'Port')}
                >
                  {copiedField === 'Port' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">AE Title</label>
                  <p className="text-gray-900 font-mono">ORTHANC</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('ORTHANC', 'AE Title')}
                >
                  {copiedField === 'AE Title' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Study Instance UID - Most Important */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Study to Search For</h3>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="text-sm font-medium text-yellow-800">Study Instance UID</label>
              <div className="flex items-center justify-between mt-1">
                <p className="text-yellow-900 font-mono text-sm break-all mr-2">
                  {caseData.orthanc_study_id}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(caseData.orthanc_study_id, 'Study Instance UID')}
                  className="flex-shrink-0"
                >
                  {copiedField === 'Study Instance UID' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Copy this UID and search for it in OsiriX to find the study
              </p>
            </div>
          </div>

          {/* Quick Copy All Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => {
                const allInfo = `PACS Server: 116.203.35.168:8042
AE Title: ORTHANC
Patient: ${caseData.patient_name}
Study Instance UID: ${caseData.orthanc_study_id}`;
                copyToClipboard(allInfo, 'All Information');
              }}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All Information
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};