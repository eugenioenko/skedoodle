import { Metadata } from "next";
import "./globals.css";
import "primereact/resources/themes/mdc-dark-indigo/theme.css";

import { AxiosProvider } from "@/contexts/axios-instance";
import { ThemeProvider } from "@/contexts/theme.context";
import { Toasts } from "@/components/toasts";
import { PrimeReactProvider } from "primereact/api";

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
    <PrimeReactProvider value={value}>
      <html lang="en">
        <ThemeProvider>
          <body className="overflow-hidden">
            <AxiosProvider>
              <Toasts />
              {children}
            </AxiosProvider>
          </body>
        </ThemeProvider>
      </html>
    </PrimeReactProvider>
  );
}
