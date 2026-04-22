import { AssignedTeacher, DraftSession, WizardClassInfo } from "./wizardTypes";

interface Props {
  classInfo: WizardClassInfo;
  teachers: AssignedTeacher[];
  sessions: DraftSession[];
}

export default function Step4Confirm({ classInfo, teachers, sessions }: Props) {
  const active = sessions.filter((s) => !s.cancelled);
  const primaries = teachers.filter((t) => t.role === "primary");
  const tas = teachers.filter((t) => t.role === "ta");

  return (
    <div className="space-y-5">
      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Thông tin lớp</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><dt className="inline text-muted-foreground">Tên: </dt><dd className="inline font-medium">{classInfo.class_name}</dd></div>
          {classInfo.course_title && <div><dt className="inline text-muted-foreground">Khóa: </dt><dd className="inline">{classInfo.course_title}</dd></div>}
          <div><dt className="inline text-muted-foreground">Program: </dt><dd className="inline">{classInfo.program}</dd></div>
          {classInfo.level && <div><dt className="inline text-muted-foreground">Level: </dt><dd className="inline">{classInfo.level}</dd></div>}
          <div><dt className="inline text-muted-foreground">Type: </dt><dd className="inline">{classInfo.class_type}</dd></div>
          <div><dt className="inline text-muted-foreground">Thời gian: </dt><dd className="inline">{classInfo.start_date} → {classInfo.end_date}</dd></div>
          {classInfo.room && <div><dt className="inline text-muted-foreground">Phòng: </dt><dd className="inline">{classInfo.room}</dd></div>}
          {classInfo.max_students != null && <div><dt className="inline text-muted-foreground">Max HV: </dt><dd className="inline">{classInfo.max_students}</dd></div>}
        </dl>
      </section>

      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Giáo viên ({teachers.length})</h3>
        {primaries.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">Primary: </span>{primaries.map((t) => t.full_name).join(", ")}</p>
        )}
        {tas.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">TA: </span>{tas.map((t) => t.full_name).join(", ")}</p>
        )}
      </section>

      <section className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Buổi học</h3>
        <p className="text-sm">
          Tổng <span className="font-medium">{sessions.length}</span> buổi —
          <span className="text-emerald-600 font-medium ml-1">{active.length}</span> active,
          <span className="text-muted-foreground ml-1">{sessions.length - active.length}</span> cancelled
        </p>
      </section>
    </div>
  );
}