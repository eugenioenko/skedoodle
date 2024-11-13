import { Metadata } from "next";
import "./globals.css";
import "rc-slider/assets/index.css";
import { AxiosProvider } from "@/contexts/axios-instance";
import { Toasts } from "@/components/toasts";

export const metadata: Metadata = {
  title: "Canvas",
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
        <AxiosProvider>
          <Toasts />
          {children}
        </AxiosProvider>
      </body>
    </html>
  );
}
