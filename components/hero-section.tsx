"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Header } from "./header"
import React, { useEffect, useRef } from "react"
import * as THREE from "three"

export function HeroSection() {
  const threeContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = threeContainerRef.current
    if (!container) return

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    )
    camera.position.set(0, 0, 600)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.domElement.style.display = "block"
    renderer.domElement.style.position = "fixed"
    renderer.domElement.style.top = "0"
    renderer.domElement.style.left = "0"
    renderer.domElement.style.zIndex = "0"
    container.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.6)
    directional.position.set(0, 1, 1)
    scene.add(directional)

    class SimplexNoise {
      private grad3: number[][] = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
      ]
      private p: number[] = []
      private perm: number[] = []

      constructor() {
        for (let i = 0; i < 256; i++) {
          this.p[i] = Math.floor(Math.random() * 256)
        }
        for (let i = 0; i < 512; i++) {
          this.perm[i] = this.p[i & 255]
        }
      }

      private dot(g: number[], x: number, y: number): number {
        return g[0] * x + g[1] * y
      }

      noise(xin: number, yin: number): number {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0

        const s = (xin + yin) * F2
        const i = Math.floor(xin + s)
        const j = Math.floor(yin + s)

        const t = (i + j) * G2
        const X0 = i - t
        const Y0 = j - t
        const x0 = xin - X0
        const y0 = yin - Y0

        let i1, j1
        if (x0 > y0) {
          i1 = 1
          j1 = 0
        } else {
          i1 = 0
          j1 = 1
        }

        const x1 = x0 - i1 + G2
        const y1 = y0 - j1 + G2
        const x2 = x0 - 1.0 + 2.0 * G2
        const y2 = y0 - 1.0 + 2.0 * G2

        const ii = i & 255
        const jj = j & 255
        const gi0 = this.perm[ii + this.perm[jj]] % 12
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12

        let n0, n1, n2

        let t0 = 0.5 - x0 * x0 - y0 * y0
        if (t0 < 0) n0 = 0.0
        else {
          t0 *= t0
          n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0)
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1
        if (t1 < 0) n1 = 0.0
        else {
          t1 *= t1
          n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1)
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2
        if (t2 < 0) n2 = 0.0
        else {
          t2 *= t2
          n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2)
        }

        return 70.0 * (n0 + n1 + n2)
      }
    }

    function createNoiseCloudTexture(size = 512, noiseScale = 3) {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!
      const img = ctx.createImageData(size, size)
      const noise = new SimplexNoise()

      let ptr = 0
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const nx = x / size
          const ny = y / size

          let v = 0
          let freq = 1
          let amp = 1
          let max = 0
          for (let o = 0; o < 5; o++) {
            v += noise.noise(nx * freq * noiseScale, ny * freq * noiseScale) * amp
            max += amp
            freq *= 2
            amp *= 0.5
          }
          v = v / max

          const cx = x - size / 2
          const cy = y - size / 2
          const dist = Math.sqrt(cx * cx + cy * cy) / (size / 2)
          const radial = Math.max(0, 1 - Math.pow(dist, 1.4))

          const alphaRaw = (v + 1) / 2
          const alpha = Math.max(0, Math.min(1, Math.pow(alphaRaw, 1.2) * radial))

          img.data[ptr++] = 255
          img.data[ptr++] = 255
          img.data[ptr++] = 255
          img.data[ptr++] = Math.floor(alpha * 255)
        }
      }

      ctx.putImageData(img, 0, 0)

      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      tex.minFilter = THREE.LinearMipMapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = true
      return tex
    }

    const cloudTexture = createNoiseCloudTexture(512, 3)

    function createCloudGroup(texture: THREE.Texture, parts = 5) {
      const group = new THREE.Group()
      for (let i = 0; i < parts; i++) {
        const mat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9 - Math.random() * 0.5,
          depthWrite: false,
        })
        const s = new THREE.Sprite(mat)

        const scale = (0.6 + Math.random() * 1.8) * (80 + Math.random() * 220)
        s.scale.setScalar(scale)

        s.position.set(
          (Math.random() - 0.5) * scale * 0.9,
          (Math.random() - 0.35) * scale * 0.45,
          (Math.random() - 0.5) * 80
        )

        mat.rotation = (Math.random() - 0.5) * 0.9
        group.add(s)
      }
      return group
    }

    type Cloud = {
      group: THREE.Group
      velocity: THREE.Vector3
      baseScale: number
    }
    const clouds: Cloud[] = []
    const cloudCount = 18
    const cloudSpritesForRaycast: THREE.Object3D[] = []
    const spriteToCloudMap = new WeakMap<THREE.Object3D, Cloud>()

    for (let i = 0; i < cloudCount; i++) {
      const parts = 3 + Math.floor(Math.random() * 4)
      const grp = createCloudGroup(cloudTexture, parts)

      const x = (Math.random() - 0.5) * window.innerWidth * 1.6
      const y = (Math.random() - 0.5) * window.innerHeight * 1.0
      const z = -Math.random() * 400
      grp.position.set(x, y, z)

      const baseScale = 1 + Math.random() * 0.6
      grp.scale.setScalar(baseScale)

      scene.add(grp)

      const velocity = new THREE.Vector3(
        0.2 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.12,
        0
      )
      const cloudObj: Cloud = { group: grp, velocity, baseScale }
      clouds.push(cloudObj)

      grp.children.forEach((child) => {
        cloudSpritesForRaycast.push(child)
        spriteToCloudMap.set(child, cloudObj)
      })
    }

    // Raycaster
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-10, -10)

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(cloudSpritesForRaycast)

      if (intersects.length > 0) {
        for (const inter of intersects.slice(0, 6)) {
          const obj = inter.object
          const cloud = spriteToCloudMap.get(obj)
          if (!cloud) continue

          const pushDir = new THREE.Vector3()
            .subVectors(
              cloud.group.position,
              new THREE.Vector3(inter.point.x, inter.point.y, cloud.group.position.z)
            )
            .normalize()
          const strength = 0.15 + Math.random() * 0.15
          cloud.velocity.add(pushDir.multiplyScalar(strength))

          const target = cloud.baseScale * (1.05 + Math.random() * 0.10)
          cloud.group.scale.lerp(new THREE.Vector3(target, target, target), 0.25)
        }
      }
    }
    window.addEventListener("mousemove", onMouseMove)

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener("resize", onResize)

    let last = performance.now()
    const animate = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      for (const c of clouds) {
        c.velocity.multiplyScalar(0.96)
        c.group.position.addScaledVector(c.velocity, dt * 60)
        c.group.position.x += 0.2 * dt * 60

        const limitX = window.innerWidth * 0.95
        const limitY = window.innerHeight * 0.95
        if (c.group.position.x > limitX) c.group.position.x = -limitX
        if (c.group.position.x < -limitX) c.group.position.x = limitX
        if (c.group.position.y > limitY) c.group.position.y = -limitY
        if (c.group.position.y < -limitY) c.group.position.y = limitY

        c.group.scale.lerp(
          new THREE.Vector3(c.baseScale, c.baseScale, c.baseScale),
          0.02
        )

        for (const child of c.group.children) {
          if (child instanceof THREE.Sprite) {
            child.material.rotation += 0.0005 * (1 + Math.random())
          }
        }
      }

      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("resize", onResize)
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }

      cloudTexture.dispose()
      for (const c of clouds) {
        for (const child of c.group.children) {
          if (child instanceof THREE.Sprite) {
            child.material.dispose()
          }
        }
        scene.remove(c.group)
      }

      renderer.dispose()
    }
  }, [])

  return (
    <section
      className="flex flex-col items-center text-center relative w-full min-h-screen"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, rgba(15, 18, 17, 0.98) 0%, rgba(160, 235, 222, 0.22) 50%, rgba(120, 252, 214, 0.30) 100%)`,
        }}
      />

      <div
        className="fixed inset-0 z-[5] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 34%, rgba(8, 11, 10, 0.56) 0%, rgba(8, 11, 10, 0.34) 34%, rgba(8, 11, 10, 0.12) 66%, rgba(8, 11, 10, 0) 100%)",
        }}
      />

      <div
        ref={threeContainerRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="absolute top-0 left-0 right-0 z-20">
        <Header />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-6 px-4 pt-32 pb-16">
        <div className="absolute inset-x-2 -inset-y-4 -z-10 rounded-3xl bg-black/25 blur-2xl md:inset-x-10" />
        <h1 className="text-foreground text-4xl md:text-5xl lg:text-7xl font-bold leading-tight drop-shadow-2xl">
          Monitorea la Calidad del Aire en Tiempo Real
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl lg:text-2xl font-medium leading-relaxed max-w-3xl drop-shadow-lg">
          Obtén información precisa sobre la calidad del aire y recibe alertas cuando los niveles de AQI superen los límites saludables.
        </p>

        <Link href="/interactive-map" className="pt-6">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 rounded-full font-semibold text-lg shadow-2xl ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
        Explorar Mapa Interactivo
          </Button>
        </Link>
      </div>
    </section>
  )
}