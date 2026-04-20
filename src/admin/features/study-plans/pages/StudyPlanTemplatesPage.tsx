import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";
import { TemplateList } from "@shared/components/study-plan/TemplateList";

export default function StudyPlanTemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="max-w-5xl mx-auto px-4 pt-4 md:px-6 md:pt-6">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/study-plans">Kế hoạch học tập</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Mẫu kế hoạch</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate("/study-plans")}>
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </Button>
      </div>
      <TemplateList />
    </div>
  );
}
