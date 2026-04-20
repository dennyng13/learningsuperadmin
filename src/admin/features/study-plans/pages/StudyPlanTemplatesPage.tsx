import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { TemplateList } from "@shared/components/study-plan/TemplateList";

export default function StudyPlanTemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="max-w-5xl mx-auto px-4 pt-4 md:px-6 md:pt-6">
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate("/study-plans")}>
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </Button>
      </div>
      <TemplateList />
    </div>
  );
}
