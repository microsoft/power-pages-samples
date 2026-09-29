import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// Clustering is a Leaflet plugin, not core. Importing it for its side effect registers
// L.markerClusterGroup on the L namespace; the two stylesheets carry the cluster bubble and
// its spiderfy animation. Without them clusters render as unstyled squares.
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Fix Leaflet default marker icon paths (broken by bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Trafalgar Square. The portal serves London, so every map defaults here. */
export const LONDON_CENTER: [number, number] = [51.5074, -0.1278]

export interface MapMarker {
  id: string
  lat: number
  lng: number
  color?: string
  radius?: number
  title?: string
  popup?: {
    title: string
    address: string
    status: string
    badge?: string
  }
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
  /** Render a "use my location" control under the zoom buttons. */
  showLocate?: boolean
  /** Localized strings for the locate control, so this component stays i18n-agnostic. */
  locateLabel?: string
  locateErrorLabel?: string
  ariaLabel?: string
}

export default function LeafletMap({
  markers = [],
  center = LONDON_CENTER,
  zoom = 12,
  height = 400,
  onClick,
  pickMode = false,
  pickLat,
  pickLng,
  showLocate = false,
  locateLabel = 'Use my current location',
  locateErrorLabel = 'Could not get your location',
  ariaLabel = 'Interactive map',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null)
  const pickMarkerRef = useRef<L.Marker | null>(null)
  // Leaflet controls are created once, outside React, but their click handler has to call the
  // current onClick. Holding it in a ref avoids tearing down and rebuilding the control (and the
  // whole map) every time the parent re-renders with a new callback identity.
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // zoomToBoundsOnClick (default true) gives the click-to-zoom behaviour; showCoverageOnHover
    // is off because the convex hull it draws reads as a selection artifact on a civic map.
    markersLayerRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
    }).addTo(map)

    mapRef.current = map

    if (onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onClickRef.current?.(e.latlng.lat, e.latlng.lng)
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

  // "Use my location" control. Registered as a Leaflet control rather than an overlaid HTML
  // button so it inherits the zoom buttons' stacking, focus order, and touch targets.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !showLocate) return

    const LocateControl = L.Control.extend({
      options: { position: 'topleft' as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        const button = L.DomUtil.create('button', '', container) as HTMLButtonElement
        button.type = 'button'
        button.title = locateLabel
        button.setAttribute('aria-label', locateLabel)
        button.style.width = '30px'
        button.style.height = '30px'
        button.style.padding = '0'
        button.style.border = 'none'
        button.style.background = '#fff'
        button.style.cursor = 'pointer'
        button.style.display = 'flex'
        button.style.alignItems = 'center'
        button.style.justifyContent = 'center'
        button.style.fontSize = '16px'
        button.innerHTML = '&#9678;'

        // stop() prevents the click from also firing the map's own click handler, which in pick
        // mode would drop the pin wherever the button happens to sit.
        L.DomEvent.on(button, 'click', (e: Event) => {
          L.DomEvent.stop(e)
          button.style.opacity = '0.5'
          map.locate({ setView: true, maxZoom: 17, enableHighAccuracy: true })
        })

        L.DomEvent.disableClickPropagation(container)
        return container
      },
    })

    const control = new LocateControl()
    map.addControl(control)

    const clearBusy = () => {
      const button = control.getContainer()?.querySelector('button')
      if (button) (button as HTMLElement).style.opacity = '1'
    }

    const handleFound = (e: L.LocationEvent) => {
      clearBusy()
      onClickRef.current?.(e.latlng.lat, e.latlng.lng)
    }

    // Fires when the user denies permission, the device has no fix, or the page is not on a
    // secure origin -- browsers gate the Geolocation API on HTTPS.
    const handleError = (e: L.ErrorEvent) => {
      clearBusy()
      console.warn(`${locateErrorLabel}: ${e.message}`)
      window.alert(locateErrorLabel)
    }

    map.on('locationfound', handleFound)
    map.on('locationerror', handleError)

    return () => {
      map.off('locationfound', handleFound)
      map.off('locationerror', handleError)
      map.removeControl(control)
    }
  }, [showLocate, locateLabel, locateErrorLabel])

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current || pickMode) return
    markersLayerRef.current.clearLayers()

    const layers: L.Layer[] = []
    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue
      const circleMarker = L.circleMarker([m.lat, m.lng], {
        radius: m.radius || 7,
        color: '#fff',
        weight: 2,
        fillColor: m.color || '#1b4965',
        fillOpacity: 0.85,
      })
      if (m.popup) {
        // Leaflet treats string popup content as HTML. Build DOM nodes with textContent so
        // Dataverse values such as the address cannot inject markup or script into the map.
        const popup = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = m.popup.title
        popup.append(title, document.createElement('br'))
        popup.append(document.createTextNode(m.popup.address), document.createElement('br'))
        const status = document.createElement('em')
        status.textContent = m.popup.status
        popup.append(status)
        if (m.popup.badge) {
          popup.append(document.createElement('br'))
          const badge = document.createElement('strong')
          badge.style.color = '#d4853a'
          badge.textContent = m.popup.badge
          popup.append(badge)
        }
        circleMarker.bindPopup(popup)
      }
      if (m.title) {
        const tooltip = document.createElement('span')
        tooltip.textContent = m.title
        circleMarker.bindTooltip(tooltip)
      }
      layers.push(circleMarker)
    }
    // addLayers (plural) batches the cluster rebuild into one pass; adding one at a time
    // re-clusters on every insert and visibly stutters past a few hundred pins.
    markersLayerRef.current.addLayers(layers)
  }, [markers, pickMode])

  // Pick mode: draggable pin
  useEffect(() => {
    if (!mapRef.current || !pickMode) return

    const lat = pickLat ?? center[0]
    const lng = pickLng ?? center[1]

    if (!pickMarkerRef.current) {
      pickMarkerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)
      pickMarkerRef.current.on('dragend', () => {
        const pos = pickMarkerRef.current!.getLatLng()
        onClickRef.current?.(pos.lat, pos.lng)
      })
    } else {
      pickMarkerRef.current.setLatLng([lat, lng])
    }
  }, [pickMode, pickLat, pickLng, center])

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
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
