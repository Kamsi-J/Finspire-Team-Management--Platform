import type { Metadata } from 'next'
import { Lora, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

const lora = Lora({ subsets: ['latin'], variable: '--font-lora' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'Finspire Team OS',
  description: 'Internal team management dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${lora.variable} ${hanken.variable} ${jetbrains.variable} font-sans`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
