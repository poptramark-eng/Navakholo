
import type { Metadata, Viewport } from "next";
import NavigationLayout from "../components/NavigationalLayout";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#145c46",
};

export const metadata: Metadata = {
  title: {
    default: "Navakholo | CBE Assessment Platform",
    template: "%s · Navakholo",
  },
  description:
    "A secure, permission-aware workspace for competency-based assessment operations, candidate registration, marks entry and institutional reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <NavigationLayout>
          {children}
        </NavigationLayout>
      </body>
    </html>
  );
}
