import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  value: string;
  weakLabel: string;
  mediumLabel: string;
  strongLabel: string;
}

function scorePassword(value: string): 1 | 2 | 3 {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return 1;
  if (score === 2) return 2;
  return 3;
}

export function PasswordStrength({ value, weakLabel, mediumLabel, strongLabel }: PasswordStrengthProps) {
  const score = scorePassword(value);

  const label = score === 1 ? weakLabel : score === 2 ? mediumLabel : strongLabel;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              step <= score && score === 1 && "bg-red-500",
              step <= score && score === 2 && "bg-amber-500",
              step <= score && score === 3 && "bg-emerald-500",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
