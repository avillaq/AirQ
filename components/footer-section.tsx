'use client';

import Link from "next/link"

export function FooterSection() {
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
    <footer className="w-full border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground text-lg font-semibold">Monitor de Calidad del Aire</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monitoreo en tiempo real de la calidad del aire para tu salud y bienestar. Mantente informado sobre el aire que respiras.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-sm font-semibold">Secciones</h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="#aqi-section"
                onClick={(e) => handleScroll(e, "#aqi-section")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Compuestos del aire
              </Link>
              <Link
                href="#map-section"
                onClick={(e) => handleScroll(e, "#map-section")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Mapa en vivo
              </Link>
              <Link
                href="#alert-form"
                onClick={(e) => handleScroll(e, "#alert-form")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Alertas
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-sm font-semibold">Herramientas</h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/interactive-map"
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Mapa interactivo completo
              </Link>
              <Link
                href="/"
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Inicio
              </Link>
              <Link
                href="#alert-form"
                onClick={(e) => handleScroll(e, "#alert-form")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Suscribirme a alertas
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}