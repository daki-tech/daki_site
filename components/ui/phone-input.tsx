"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

/** Phone input with fixed +380 prefix. Always emits full number like "+380XXXXXXXXX". */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    // Strip +380 / 380 / +38 prefix for display
    const strip = (v: string) => {
      let s = v.replace(/[^\d]/g, "");
      if (s.startsWith("380")) s = s.slice(3);
      else if (s.startsWith("80") && s.length > 9) s = s.slice(2);
      else if (s.startsWith("0") && s.length > 9) s = s.slice(1);
      return s.slice(0, 9); // max 9 digits after +380
    };

    const suffix = strip(value || "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      const digits = raw.slice(0, 9);
      onChange(digits ? `+380${digits}` : "");
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const digits = strip(pasted);
      onChange(digits ? `+380${digits}` : "");
    };

    return (
      <div
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-input bg-background text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className,
        )}
      >
        <span className="select-none pl-3 pr-1 text-muted-foreground">+380</span>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={suffix}
          onChange={handleChange}
          onPaste={handlePaste}
          className="flex-1 bg-transparent py-2 pr-3 outline-none placeholder:text-muted-foreground"
          placeholder="XX XXX XX XX"
          {...props}
        />
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
