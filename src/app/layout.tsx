
import type { Metadata, Viewport } from "next";
import NavigationLayout from "../components/NavigationalLayout";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#15365a",
};

export const metadata: Metadata = {
  title: {
    default: "Navakholo | Assessment workspace",
    template: "%s · Navakholo",
  },
  description:
    "A connected workspace for competency-based assessment, candidate registration, marks entry and institutional reporting in Navakholo.",
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
