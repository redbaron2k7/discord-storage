import './globals.css'
// @ts-ignore
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Discord Storage Service',
  description: 'A free storage service using Discord',
}

export default function RootLayout({
  children,
}: {
  children: Readonly<React.ReactNode>
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}