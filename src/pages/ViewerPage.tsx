import { useParams } from "react-router-dom";

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
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Viewer Page</h1>
        <p className="text-muted-foreground mb-4">Case ID: {caseId}</p>
        <p className="text-sm text-muted-foreground">Image viewer functionality is currently unavailable.</p>
      </div>
    </div>
  );
};

export default ViewerPage;