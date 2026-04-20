import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@shared/components/ui/button";

type PayrollStatus = "paid" | "pending" | "processing";

const dashboardStats = {
  monthEarnings: 42_750_000,
};

const earningsTrend = [
  { month: "T10", amount: 28_500_000 },
  { month: "T11", amount: 31_200_000 },
  { month: "T12", amount: 35_400_000 },
  { month: "T1", amount: 33_900_000 },
  { month: "T2", amount: 38_100_000 },
  { month: "T3", amount: 42_750_000 },
];

const payrollItems: {
  id: string; period: string; classes: number; hours: number;
  gross: number; tax: number; net: number; status: PayrollStatus;
}[] = [
  { id: "p202503", period: "Tháng 03/2025", classes: 5, hours: 86, gross: 42_750_000, tax: 4_275_000, net: 38_475_000, status: "pending" },
  { id: "p202502", period: "Tháng 02/2025", classes: 4, hours: 78, gross: 38_100_000, tax: 3_810_000, net: 34_290_000, status: "paid" },
  { id: "p202501", period: "Tháng 01/2025", classes: 4, hours: 72, gross: 33_900_000, tax: 3_390_000, net: 30_510_000, status: "paid" },
  { id: "p202412", period: "Tháng 12/2024", classes: 4, hours: 80, gross: 35_400_000, tax: 3_540_000, net: 31_860_000, status: "paid" },
  { id: "p202411", period: "Tháng 11/2024", classes: 3, hours: 70, gross: 31_200_000, tax: 3_120_000, net: 28_080_000, status: "paid" },
];

const statusStyle: Record<PayrollStatus, string> = {
  paid: "bg-primary/10 text-primary",
  pending: "bg-secondary text-secondary-foreground",
  processing: "bg-muted text-muted-foreground",
};

const statusLabel: Record<PayrollStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ thanh toán",
  processing: "Đang xử lý",
};

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

export default function TeacherIncomeTab() {
  const ytdGross = payrollItems.reduce((s, p) => s + p.gross, 0);
  const ytdTax = payrollItems.reduce((s, p) => s + p.tax, 0);
  const ytdNet = payrollItems.reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-6 bg-gradient-primary text-primary-foreground shadow-elevated">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-6 w-6 opacity-90" />
            <span className="text-xs uppercase tracking-wider opacity-80">YTD Gross</span>
          </div>
          <div className="font-display text-3xl font-bold mt-3">{formatVND(ytdGross)}</div>
          <div className="text-xs opacity-90 mt-1">5 kỳ lương gần nhất</div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center justify-between">
            <Receipt className="h-6 w-6 text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Thuế TNCN</span>
          </div>
          <div className="font-display text-3xl font-bold mt-3">{formatVND(ytdTax)}</div>
          <div className="text-xs text-muted-foreground mt-1">10% khấu trừ tại nguồn</div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center justify-between">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">YTD Net</span>
          </div>
          <div className="font-display text-3xl font-bold mt-3 text-primary">{formatVND(ytdNet)}</div>
          <div className="text-xs text-muted-foreground mt-1">Đã chuyển khoản</div>
        </div>
      </div>

      <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg">Thu nhập theo tháng</h2>
            <p className="text-xs text-muted-foreground">Gross income — 6 tháng</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Tháng này</div>
            <div className="font-display font-bold text-xl text-primary">{formatVND(dashboardStats.monthEarnings)}</div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earningsTrend}>
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1_000_000}tr`} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [formatVND(v), "Thu nhập"]}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg">Bảng lương chi tiết</h2>
            <p className="text-xs text-muted-foreground">Dùng chung cấu trúc với Teacher’s Hub</p>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Xuất Excel YTD</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Kỳ lương</th>
                <th className="px-4 py-3 font-semibold">Lớp · Giờ</th>
                <th className="px-4 py-3 font-semibold text-right">Gross</th>
                <th className="px-4 py-3 font-semibold text-right">Thuế</th>
                <th className="px-4 py-3 font-semibold text-right">Net</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payrollItems.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">{p.period}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.classes} lớp · {p.hours} giờ</td>
                  <td className="px-4 py-3 text-right font-mono">{formatVND(p.gross)}</td>
                  <td className="px-4 py-3 text-right font-mono">-{formatVND(p.tax)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-primary">{formatVND(p.net)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[p.status]}`}>{statusLabel[p.status]}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-primary hover:underline text-xs font-semibold inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-secondary/40 border border-primary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-lg">Khai báo thuế TNCN năm 2024</h3>
            <p className="text-sm text-muted-foreground mt-1">Bạn có thể dùng khu vực này để quản lý biên lai khấu trừ và hồ sơ quyết toán cho giáo viên.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button><Download className="h-4 w-4 mr-2" />Tải biên lai khấu trừ</Button>
              <Button variant="outline">Cập nhật người phụ thuộc</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}