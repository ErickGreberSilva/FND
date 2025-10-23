import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/components/Theme-provider'
import { LoteBuscaProvider } from "@/context/LoteBuscaContext";
import { LoteProvider } from '@/context/LoteContext';
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
          <LoteProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </LoteProvider>
        </LoteBuscaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
