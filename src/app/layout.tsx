import { Metadata } from "next";
import "./globals.css";
import "rc-slider/assets/index.css";
import { Toasts } from "@/components/ui/toasts";

export const metadata: Metadata = {
  title: "Skedoodle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="overflow-hidden">
        {children}
        <Toasts />
      </body>
    </html>
  );
}
