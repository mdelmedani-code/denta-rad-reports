import MeetTheTeam from "@/components/MeetTheTeam";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const MeetTheTeamPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <MeetTheTeam />
      <div className="flex justify-center py-8">
        <Button asChild variant="outline">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default MeetTheTeamPage;
