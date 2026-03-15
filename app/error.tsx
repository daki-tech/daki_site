"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex min-h-[100dvh] items-center justify-center px-4">
          <div className="space-y-4 text-center">
            <p className="font-serif text-5xl font-semibold">500</p>
            <p className="text-muted-foreground">Произошла ошибка</p>
            <Button onClick={reset}>Попробовать снова</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
