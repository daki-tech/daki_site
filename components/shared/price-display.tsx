import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  discountPercent?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({ price, discountPercent = 0, className, size = "md" }: PriceDisplayProps) {
  const hasDiscount = discountPercent > 0;
  const finalPrice = hasDiscount ? price * (1 - discountPercent / 100) : price;

  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold", sizeClasses[size])}>
        {formatCurrency(finalPrice)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(price)}
          </span>
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
