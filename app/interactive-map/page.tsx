import InteractiveMap from "@/components/interactive-map/InteractiveMap"
import { ModelViewerRegister } from "@/components/model-viewer-register"

export default function MapaPage() {
  return (
    <>
      <ModelViewerRegister />
      <InteractiveMap />
    </>
  )
}