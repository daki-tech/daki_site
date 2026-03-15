"use client";

import { useMemo, useState } from "react";

export type AuthStep =
  | "login"
  | "signup"
  | "otp-verify"
  | "forgot-password"
  | "reset-otp"
  | "new-password"
  | "success";

export type AuthDirection = "forward" | "backward";

interface AuthFlowState {
  step: AuthStep;
  direction: AuthDirection;
  email: string;
  error: string | null;
}

export function useAuthFlow(initialStep: AuthStep) {
  const [state, setState] = useState<AuthFlowState>({
    step: initialStep,
    direction: "forward",
    email: "",
    error: null,
  });

  const api = useMemo(
    () => ({
      state,
      setEmail(email: string) {
        setState((prev) => ({ ...prev, email }));
      },
      setError(error: string | null) {
        setState((prev) => ({ ...prev, error }));
      },
      go(step: AuthStep, direction: AuthDirection = "forward") {
        setState((prev) => ({ ...prev, step, direction, error: null }));
      },
    }),
    [state],
  );

  return api;
}
