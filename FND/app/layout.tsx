import { Outfit } from 'next/font/google';
import './globals.css';



import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/components/Theme-provider'
import { LoteBuscaProvider } from "@/context/LoteBuscaContext";
import { LoteProvider } from '@/context/LoteContext';
import { Lato, Poppins } from "next/font/google";

// Configuração das fontes
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"], // Normal + Bold
  variable: "--font-lato",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Escolha os pesos que usa
  variable: "--font-poppins",
  display: "swap",
});
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
