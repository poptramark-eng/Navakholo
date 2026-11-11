
import type { Metadata } from "next";
import NavigationLayout from "../components/NavigationalLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navakholo Examination Management",
  description: "CBE Interschool Examination Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavigationLayout>
          {children}
        </NavigationLayout>
      </body>
    </html>
  );
}
