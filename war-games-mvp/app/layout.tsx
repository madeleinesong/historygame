import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "War Games — WWI Sandbox",
  description: "Edit a headline and watch counterfactuals propagate."
};

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}