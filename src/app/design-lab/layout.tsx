import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  return <div className={fraunces.variable}>{children}</div>;
}
