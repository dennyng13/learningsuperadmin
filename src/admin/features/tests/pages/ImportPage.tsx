import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileText, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import ImportTestPage from "./ImportTestPage";
import ImportExercisePage from "./ImportExercisePage";

export default function ImportPage() {
  const [tab, setTab] = useState("test");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Import</span>
      </nav>

      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold">Import bài thi / bài tập</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload file Word/PDF để AI tự động parse câu hỏi</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto md:max-w-md">
            <TabsTrigger value="test" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" /> Bài thi (đề thi)
            </TabsTrigger>
            <TabsTrigger value="exercise" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Layers className="h-3.5 w-3.5 md:h-4 md:w-4" /> Bài tập luyện
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="test" className="mt-6">
          <TabSkeleton><ImportTestPage embedded /></TabSkeleton>
        </TabsContent>
        <TabsContent value="exercise" className="mt-6">
          <TabSkeleton><ImportExercisePage embedded /></TabSkeleton>
        </TabsContent>
      </Tabs>
    </div>
  );
}
