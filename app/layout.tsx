import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ReactNode } from 'react'
import type { Viewport } from 'next'
import { Toaster } from 'sonner'
import { ModelViewerRegister } from '@/components/model-viewer-register'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: 'Misti Skies - Calidad del Aire',
  description: 'Monitorea la calidad del aire en tiempo real con visualizaciones interactivas',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo192.png',
  },
  manifest: '/manifest.json',
}


export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css"
          rel="stylesheet"
        />
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      <body>
        <ModelViewerRegister />
        <Toaster position="bottom-right" richColors />
        {children}
      </body>
    </html>
  )
}
