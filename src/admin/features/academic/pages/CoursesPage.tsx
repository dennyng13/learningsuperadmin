import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2, Layers, Settings2, EyeOff } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@shared/components/ui/scroll-area";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import ProgramDetailTab from "@admin/features/academic/components/ProgramDetailTab";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * /courses — cockpit quản lý 3 chương trình chuẩn và các cấp độ con.
 * Tạo/xóa program tuỳ ý đã được bỏ khỏi UX để tránh phát sinh dữ liệu rác.
 */
export default function CoursesPage() {
  const { programs, loading, refetch: refetchPrograms } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const defaultTab = useMemo(() => tabFromUrl || programs[0]?.key || "", [tabFromUrl, programs]);
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (loading) return;
    const valid = programs.some((p) => p.key === tab);
    if (!valid) setTab(programs[0]?.key ?? "");
  }, [loading, programs, tab]);

  const handleTabChange = (next: string) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const handleProgramChanged = async () => {
    await Promise.all([refetchPrograms(), refetchLevels()]);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Học thuật</p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Quản lý khóa học
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Quản lý 3 chương trình chuẩn và cấp độ con: <strong>IELTS</strong>, <strong>WRE</strong>, <strong>Customized</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/courses/programs">
              <Settings2 className="h-3.5 w-3.5" /> Chương trình
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <Link to="/courses/levels">
              <Layers className="h-3.5 w-3.5" /> Cấp độ
            </Link>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : programs.length === 0 ? (
        <section className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Chưa có chương trình chuẩn nào.</p>
          <Button asChild size="sm">
            <Link to="/courses/programs">Chuẩn hóa dữ liệu</Link>
          </Button>
        </section>
      ) : (
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="h-auto p-1 inline-flex flex-nowrap gap-1 bg-muted/60">
              {programs.map((p) => {
                const Icon = getProgramIcon(p.key);
                const palette = getProgramPalette(p.key);
                const inactive = p.status === "inactive";
                return (
                  <TabsTrigger
                    key={p.id}
                    value={p.key}
                    className={cn(
                      "h-8 px-2.5 gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm",
                      inactive && "opacity-60",
                    )}
                  >
                    <span className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", palette.iconBg)}>
                      <Icon className={cn("h-3 w-3", palette.iconText)} />
                    </span>
                    <span className="font-semibold">{p.name}</span>
                    {inactive && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {programs.map((p) => (
            <TabsContent key={p.id} value={p.key} className="mt-4 space-y-4">
              <ProgramDetailTab
                program={p}
                levels={levels}
                onChanged={handleProgramChanged}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
