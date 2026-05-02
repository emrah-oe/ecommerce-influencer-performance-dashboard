import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { ThemeProvider } from '../components/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'

export const metadata: Metadata = {
  title: 'E-Commerce Influencer Performance Dashboard',
}

const fouc = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: fouc }} />
      </head>
      <body className="bg-[#E8E5DF] text-slate-900 antialiased dark:bg-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <div className="mx-auto max-w-screen-2xl px-6">
            <header className="flex items-center justify-between py-6">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-gray-100">
                E-Commerce Influencer Performance Dashboard
              </h1>
              <ThemeToggle />
            </header>
            <main className="pb-12">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
