import { useParams } from "react-router-dom";
import { OHIFViewer } from "@/components/OHIFViewer";

const ViewerPage = () => {
  const { caseId } = useParams<{ caseId: string }>();

  if (!caseId) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">Case ID not provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <OHIFViewer 
        caseId={caseId}
        className="w-full h-full"
      />
    </div>
  );
};

export default ViewerPage;