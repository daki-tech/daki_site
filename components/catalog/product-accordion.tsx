"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { CatalogModel } from "@/lib/types";

interface ProductAccordionProps {
  model: CatalogModel;
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-neutral-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-neutral-600"
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? <Minus className="h-4 w-4 flex-shrink-0" /> : <Plus className="h-4 w-4 flex-shrink-0" />}
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm leading-relaxed text-neutral-600">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductAccordion({ model }: ProductAccordionProps) {
  const characteristics = model.delivery_info;
  const description = model.description;
  const care = model.care_instructions;

  const hasContent = characteristics || description || care;
  if (!hasContent) return null;

  return (
    <div className="mt-6 border-b border-neutral-200">
      {characteristics && (
        <AccordionItem title="Характеристики">
          <div className="space-y-1">
            {characteristics.split("\n").filter(Boolean).map((line, i) => {
              const [key, ...rest] = line.split(":");
              if (rest.length > 0) {
                return (
                  <div key={i} className="flex gap-1">
                    <span className="font-medium text-neutral-900">{key.trim()}:</span>
                    <span>{rest.join(":").trim()}</span>
                  </div>
                );
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        </AccordionItem>
      )}

      {description && (
        <AccordionItem title="Опис">
          {description.includes("<") ? (
            <div dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <p>{description}</p>
          )}
        </AccordionItem>
      )}

      {care && (
        <AccordionItem title="Догляд за виробом">
          {care.includes("<") ? (
            <div dangerouslySetInnerHTML={{ __html: care }} />
          ) : (
            <div className="space-y-1">
              {care.split("\n").filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </AccordionItem>
      )}
    </div>
  );
}
