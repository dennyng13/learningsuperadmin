import { Card } from "@shared/components/ui/card";
import { Globe, Clock, Building2 } from "lucide-react";

export default function AdminGeneralTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Cấu hình chung</h2>
        <p className="text-sm text-muted-foreground">
          Thông tin trung tâm và cấu hình hệ thống
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Trung tâm</p>
              <p className="text-xs text-muted-foreground">Learning Plus</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Múi giờ</p>
              <p className="text-xs text-muted-foreground">Asia/Ho_Chi_Minh (UTC+7)</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Website</p>
              <p className="text-xs text-muted-foreground">ieltspractice.lovable.app</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        <p className="text-sm text-muted-foreground">
           Các cài đặt nâng cao (thay đổi logo, tên trung tâm, timezone) sẽ được bổ sung trong phiên bản tiếp theo.
        </p>
      </Card>
    </div>
  );
}
