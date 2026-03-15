import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="space-y-4 text-center">
        <p className="font-serif text-7xl font-semibold">404</p>
        <p className="text-muted-foreground">Страница не найдена</p>
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
