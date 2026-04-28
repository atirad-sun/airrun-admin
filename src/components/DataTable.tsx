import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** How to render the cell. Receives the row; can return any ReactNode. */
  cell: (row: T) => React.ReactNode;
  /** Tailwind classes applied to <td> for this column (alignment, width hints). */
  className?: string;
  /** If true, this column gets `w-full` so other columns shrink to content. */
  fill?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Extracts a stable key from the row; usually `(r) => r.id`. */
  rowKey: (row: T) => string;
  /** Click handler — used to open a detail drawer on row click. */
  onRowClick?: (row: T) => void;
  /** Shown when `rows` is empty. */
  emptyMessage?: string;
  loading?: boolean;
}

/**
 * Lean, generic table built on shadcn Table.
 *
 * Intentionally minimal: no sorting, no virtualization, no built-in pagination.
 * For v1 the admin lists are < 200 rows hard-capped at the API; that's well
 * within "render everything." Promote complexity here when a screen actually
 * needs it.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "No rows.",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(c.fill && "w-full", c.className)}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
