"use client";

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function useConfirmDialog() {
  const [state, setState] = useState<{ open: boolean; title: string; description: string; resolve: ((v: boolean) => void) | null }>({ open: false, title: "", description: "", resolve: null });
  const confirm = useCallback((title: string, description = "") => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, title, description, resolve });
    });
  }, []);
  const handleClose = useCallback((result: boolean) => {
    state.resolve?.(result);
    setState({ open: false, title: "", description: "", resolve: null });
  }, [state]);
  const ConfirmDialog = useMemo(() => {
    return function ConfirmDialogInner() {
      return (
        <Dialog open={state.open} onOpenChange={(open) => !open && handleClose(false)}>
          <DialogContent className="rounded-2xl border-0 shadow-2xl p-0 max-w-sm">
            <div className="px-6 pb-5 pt-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">{state.title}</DialogTitle>
                {state.description && <DialogDescription className="text-sm text-gray-500">{state.description}</DialogDescription>}
              </DialogHeader>
              <DialogFooter className="flex gap-3 sm:gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => handleClose(false)}>Отмена</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleClose(true)}>Подтвердить</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [state.open, state.title, state.description, handleClose]);
  return { confirm, ConfirmDialog };
}
