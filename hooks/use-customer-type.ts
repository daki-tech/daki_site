"use client";

export type CustomerType = "retail" | "wholesale";

export function useCustomerType(): { customerType: CustomerType; loading: boolean } {
  return { customerType: "retail", loading: false };
}
