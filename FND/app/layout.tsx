import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/components/Theme-provider'
import { LoteBuscaProvider } from "@/context/LoteBuscaContext";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
           <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        <LoteBuscaProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </LoteBuscaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
