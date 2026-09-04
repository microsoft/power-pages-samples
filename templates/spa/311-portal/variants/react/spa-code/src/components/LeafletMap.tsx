import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon paths (broken by bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const NYC_CENTER: [number, number] = [40.7128, -74.006]

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color?: string
  radius?: number
  title?: string
  popup?: string
}

interface LeafletMapProps {
  markers?: MapMarker[]
  center?: [number, number]
  zoom?: number
  height?: number | string
  onClick?: (lat: number, lng: number) => void
  /** Show a single draggable pin for location picking */
  pickMode?: boolean
  pickLat?: number
  pickLng?: number
}

export default function LeafletMap({
  markers = [],
  center = NYC_CENTER,
  zoom = 12,
  height = 400,
  onClick,
  pickMode = false,
  pickLat,
  pickLng,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const pickMarkerRef = useRef<L.Marker | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    if (onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onClick(e.latlng.lat, e.latlng.lng)
      })
    }

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      pickMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current || pickMode) return
    markersLayerRef.current.clearLayers()

    for (const m of markers) {
      if (!m.lat || !m.lng) continue
      const circleMarker = L.circleMarker([m.lat, m.lng], {
        radius: m.radius || 7,
        color: '#fff',
        weight: 2,
        fillColor: m.color || '#1b4965',
        fillOpacity: 0.85,
      })
      if (m.popup) circleMarker.bindPopup(m.popup)
      if (m.title) circleMarker.bindTooltip(m.title)
      markersLayerRef.current!.addLayer(circleMarker)
    }
  }, [markers, pickMode])

  // Pick mode: draggable pin
  useEffect(() => {
    if (!mapRef.current || !pickMode) return

    const lat = pickLat || center[0]
    const lng = pickLng || center[1]

    if (!pickMarkerRef.current) {
      pickMarkerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)
      pickMarkerRef.current.on('dragend', () => {
        const pos = pickMarkerRef.current!.getLatLng()
        onClick?.(pos.lat, pos.lng)
      })
    } else {
      pickMarkerRef.current.setLatLng([lat, lng])
    }
  }, [pickMode, pickLat, pickLng, center, onClick])

  return (
    <div
      ref={containerRef}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        borderRadius: 'var(--radius-md, 8px)',
        overflow: 'hidden',
        zIndex: 0,
      }}
    />
  )
}
