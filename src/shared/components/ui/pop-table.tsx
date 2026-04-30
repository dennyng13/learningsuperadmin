import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import * as React from "react";

const TableRoot = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full font-body border-collapse", className)}
      {...props}
    />
  </div>
));
TableRoot.displayName = "Table.Root";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-lp-cream font-display text-xs uppercase tracking-wider text-lp-ink",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "Table.Header";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr]:border-b-2 [&_tr]:border-lp-ink/15 [&_tr:last-child]:border-b-0", className)}
    {...props}
  />
));
TableBody.displayName = "Table.Body";

const tableRowVariants = cva("transition-colors", {
  variants: {
    selected: {
      true:
        "bg-lp-teal/10 [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-lp-teal " +
        "[&>td:first-child]:pl-3",
      false: "hover:bg-lp-yellow/20",
    },
  },
  defaultVariants: { selected: false },
});

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      data-selected={selected ? "" : undefined}
      className={cn(tableRowVariants({ selected }), className)}
      {...props}
    />
  ),
);
TableRow.displayName = "Table.Row";

const TableHeadCell = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "px-4 py-3 text-left font-bold border-b-2 border-lp-ink whitespace-nowrap",
      className,
    )}
    {...props}
  />
));
TableHeadCell.displayName = "Table.HeadCell";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
));
TableCell.displayName = "Table.Cell";

export const Table = {
  Root:     TableRoot,
  Header:   TableHeader,
  Body:     TableBody,
  Row:      TableRow,
  HeadCell: TableHeadCell,
  Cell:     TableCell,
};
