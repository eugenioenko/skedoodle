import { Metadata } from "next";
import "./globals.css";
import { AxiosProvider } from "@/contexts/axios-instance";
import { ThemeProvider } from "@/contexts/theme.context";
import { Toasts } from "@/components/toasts";

export const metadata: Metadata = {
  title: "Canvas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ThemeProvider>
        <body className="theme-light">
          <AxiosProvider>
            <Toasts />
            {children}
          </AxiosProvider>
        </body>
      </ThemeProvider>
    </html>
  );
}
