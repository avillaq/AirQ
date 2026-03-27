'use client';

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function Header() {
  const navItems = [
    { name: "Inicio", href: "/" },
    { name: "Mapa Interactivo", href: "/interactive-map" },
    { name: "Compuestos del Aire", href: "#aqi-section" },
    { name: "Alertas", href: "#alert-form" },
  ]

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const targetId = href.substring(1)
      const targetElement = document.getElementById(targetId)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <header className="w-full py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <span className="text-foreground text-xl font-semibold cursor-pointer">AirQ</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleScroll(e, item.href)}
              className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-full font-medium transition-colors text-sm"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="#alert-form" className="hidden lg:block">
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-2 rounded-full font-medium shadow-sm text-sm">
              Recibir Alertas
            </Button>
          </Link>

          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex flex-col gap-2">
                  <span className="text-foreground text-lg font-semibold">Monitor de Calidad del Aire</span>
                  <span className="text-muted-foreground text-sm">Navegar</span>
                </div>
                <nav className="flex flex-col gap-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleScroll(e, item.href)}
                      className="text-foreground hover:text-primary px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
                <Link href="#alert-form" className="w-full mt-2">
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-full font-medium shadow-sm w-full">
                    Recibir Alertas
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}