import {
  AlignLeft, Calendar, CheckSquare, Coins, Hash, ListChecks, Type,
  type LucideIcon,
} from "lucide-react";
import type { ContractFieldType } from "../types";

export interface FieldTypeMeta {
  icon: LucideIcon;
  /** Tailwind classes for the icon background pill. */
  pillClass: string;
}

export const FIELD_TYPE_META: Record<ContractFieldType, FieldTypeMeta> = {
  text:     { icon: Type,        pillClass: "bg-blue-50 text-blue-700"      },
  textarea: { icon: AlignLeft,   pillClass: "bg-indigo-50 text-indigo-700"  },
  number:   { icon: Hash,        pillClass: "bg-slate-50 text-slate-700"    },
  date:     { icon: Calendar,    pillClass: "bg-violet-50 text-violet-700"  },
  currency: { icon: Coins,       pillClass: "bg-amber-50 text-amber-700"    },
  dropdown: { icon: ListChecks,  pillClass: "bg-emerald-50 text-emerald-700"},
  checkbox: { icon: CheckSquare, pillClass: "bg-rose-50 text-rose-700"      },
};
