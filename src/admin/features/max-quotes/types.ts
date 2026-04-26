export type MaxQuoteCategory =
  | "motivation"
  | "study"
  | "exam"
  | "celebration"
  | "empty"
  | "loading";

export type MaxQuoteLanguage = "vi" | "en";

export interface MaxQuote {
  id: string;
  text: string;
  author: string | null;
  category: MaxQuoteCategory;
  language: MaxQuoteLanguage;
  is_active: boolean;
  weight: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const QUOTE_CATEGORIES: { key: MaxQuoteCategory; label: string; hint: string }[] = [
  { key: "motivation",  label: "Động lực",  hint: "Câu truyền cảm hứng chung — show ở banner, dashboard." },
  { key: "study",       label: "Học tập",   hint: "Khuyến khích luyện tập — show khi mở study plan." },
  { key: "exam",        label: "Thi cử",    hint: "Trấn an trước/trong khi làm test." },
  { key: "celebration", label: "Chúc mừng", hint: "Sau khi hoàn thành bài / đạt thành tích." },
  { key: "empty",       label: "Empty",     hint: "Khi chưa có dữ liệu để hiển thị." },
  { key: "loading",     label: "Loading",   hint: "Hiện trên loading screens (thay messages cũ)." },
];

export const QUOTE_LANGUAGES: { key: MaxQuoteLanguage; label: string }[] = [
  { key: "vi", label: "Tiếng Việt" },
  { key: "en", label: "English" },
];