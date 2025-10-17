import { ReactNode } from "react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${className}`}>
    {children}
  </span>;
}
