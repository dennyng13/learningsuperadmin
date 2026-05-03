/**
 * PinnedAnnouncement — Thông báo được ghim (yellow card)
 * Match mockup pages-class-detail.jsx "Pinned announce"
 *
 * Features:
 * - Yellow/amber background
 * - Pin icon + timestamp
 * - Quote text
 * - Author avatar + name
 * - Read count
 */
import { Card } from "@shared/components/ui/card";
import { Pin } from "lucide-react";

interface AnnouncementAuthor {
  name: string;
  avatarBg: string;
  initial: string;
}

interface PinnedAnnouncementProps {
  text?: string;
  author?: AnnouncementAuthor;
  timestamp?: string;
  readCount?: number;
  loading?: boolean;
}

const DEFAULT_AUTHOR: AnnouncementAuthor = {
  name: "Mr. Khoa",
  avatarBg: "#FA7D64",
  initial: "K",
};

export function PinnedAnnouncement({
  text = 'Cả lớp nhớ ôn 50 từ vựng list 12 trước buổi tối nay nhé. Mai sẽ có quick quiz 10 câu đầu giờ! 💪',
  author = DEFAULT_AUTHOR,
  timestamp = "2h trước",
  readCount = 14,
  loading = false,
}: PinnedAnnouncementProps) {
  if (loading) {
    return (
      <Card className="p-4 h-32 animate-pulse bg-amber-50 border-[2px] border-amber-200">
        <div className="h-4 w-24 bg-amber-200/50 rounded mb-3" />
        <div className="h-12 bg-amber-200/30 rounded" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[2px] border-amber-300 shadow-pop bg-gradient-to-br from-amber-50 to-amber-100/50">
      {/* Pin tag */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-amber-200/60">
        <Pin className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Đã ghim · {timestamp}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm text-lp-ink leading-relaxed font-medium">
          "{text}"
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-amber-200/60 bg-amber-100/30">
        <div
          className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-amber-300"
          style={{ background: author.avatarBg }}
        >
          {author.initial}
        </div>
        <span className="text-xs font-bold text-lp-ink">{author.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-semibold">
          {readCount} đã đọc
        </span>
      </div>
    </Card>
  );
}
