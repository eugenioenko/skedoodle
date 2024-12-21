import { Metadata } from "next";
import "./globals.css";
import "rc-slider/assets/index.css";
import { Toasts } from "@/components/toasts";

export const metadata: Metadata = {
  title: "Skedoodle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const value = {
    ripple: true,
  };

  return (
    <html lang="en">
      <body className="overflow-hidden">
        <Toasts />
        {children}
      </body>
    </html>
  );
}
