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
          <footer className="fixed bottom-0 left-0 w-full bg-gray-900 text-white text-center py-2">
            <span>Project on <a href="https://github.com/redbaron2k7/discord-storage" className="underline">GitHub</a></span> | <span>Contact me on Discord: <a href="https://discord.com/users/1142923640778797157" className="underline">@redbaron2k7</a></span>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}