import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}

export function SectionContainer({
  children,
  className,
  as: Tag = "section",
}: SectionContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1280px] px-4 md:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}
