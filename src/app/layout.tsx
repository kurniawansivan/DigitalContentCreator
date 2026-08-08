import type { Metadata } from "next";
import type { ReactElement } from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Momenta",
  description: "Content planner and reel auto-generator for Indonesian UMKM and solo creators.",
};

export default function RootLayout({ children }: LayoutProps<"/">): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
