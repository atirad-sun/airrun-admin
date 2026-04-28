import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** "right" matches the design's prototype; default keeps it consistent across screens. */
  side?: "right" | "left";
}

/**
 * Generic right-side drawer for showing/editing a single row's detail.
 *
 * Thin wrapper over shadcn Sheet — exists to standardize sizing and header
 * layout across screens (Bugs / Reports / Users / Feedback / etc.). Each
 * screen owns the body content (form fields, status timeline, etc.).
 */
export default function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="w-full max-w-xl sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="px-4 pb-6 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
