import {
  Route, Recycle, TreePine, Droplets, Shield, Home, Paintbrush, Waves,
  TrafficCone, HandHeart, CircleDot, PersonStanding, AlertTriangle, Fence,
  Trash2, Package, Ban, Sofa, Trees, ParkingSquare, Gamepad2,
  Droplet, PipetteIcon, FireExtinguisher, Lightbulb, Car, Dog,
  Volume2, Building2, FileQuestion, Brush, Trash, RectangleHorizontal,
  Calendar, Ticket, WavesLadder, TrafficConeIcon, Octagon, ParkingCircle,
  Footprints, HomeIcon, Apple, Accessibility, Search, FileText,
  BookOpen, MapPin, Clock, Mail, Phone, ExternalLink, ChevronRight,
  AlertCircle, CheckCircle, Info, XCircle, Loader2, Inbox,
  Upload, Camera, ArrowLeft, ArrowRight, Grid3X3, List,
  Lock, Settings, Edit, BarChart3, Users, Filter,
  type LucideIcon,
} from 'lucide-react'

// Category icon mapping (keys match spa311_slug values in Dataverse)
export const categoryIcons: Record<string, LucideIcon> = {
  'roads': Route,
  'waste': Recycle,
  'parks': TreePine,
  'utilities': Droplets,
  'safety': Shield,
  'property': Home,
  'graffiti': Paintbrush,
  'recreation': Waves,
  'traffic': TrafficCone,
  'services': HandHeart,
  'supportive-services': HandHeart,
}

// Service type icon mapping (keys match spa311_slug values in Dataverse)
export const serviceTypeIcons: Record<string, LucideIcon> = {
  'pothole': CircleDot,
  'pothole-repair': CircleDot,
  'sidewalk-repair': PersonStanding,
  'road-damage': AlertTriangle,
  'road-surface-damage': AlertTriangle,
  'curb-repair': Fence,
  'curb-gutter-repair': Fence,
  'missed-pickup': Trash2,
  'missed-waste-pickup': Trash2,
  'bin-request': Package,
  'illegal-dumping': Ban,
  'large-item': Sofa,
  'large-item-pickup': Sofa,
  'tree-issue': Trees,
  'tree-maintenance': Trees,
  'park-maintenance': ParkingSquare,
  'playground-repair': Gamepad2,
  'water-leak': Droplet,
  'sewer-issue': PipetteIcon,
  'sewer-drainage': PipetteIcon,
  'hydrant-issue': FireExtinguisher,
  'fire-hydrant': FireExtinguisher,
  'streetlight': Lightbulb,
  'streetlight-outage': Lightbulb,
  'abandoned-vehicle': Car,
  'animal-control': Dog,
  'noise-complaint': Volume2,
  'property-standards': Building2,
  'zoning-inquiry': FileQuestion,
  'graffiti-removal': Brush,
  'litter-hotspot': Trash,
  'illegal-sign': RectangleHorizontal,
  'facility-booking': Calendar,
  'event-permit': Ticket,
  'pool-issue': WavesLadder,
  'pool-splash-pad': WavesLadder,
  'traffic-signal': TrafficConeIcon,
  'sign-issue': Octagon,
  'traffic-sign': Octagon,
  'parking-concern': ParkingCircle,
  'crosswalk-request': Footprints,
  'housing-support': HomeIcon,
  'food-assistance': Apple,
  'accessibility-request': Accessibility,
}

// Utility component for rendering icons with consistent styling
interface IconProps {
  name: string
  type?: 'category' | 'service'
  size?: number
  className?: string
  color?: string
}

export default function Icon({ name, type = 'service', size = 20, className, color }: IconProps) {
  const iconMap = type === 'category' ? categoryIcons : serviceTypeIcons
  const IconComponent = iconMap[name]

  if (!IconComponent) {
    return <FileText size={size} className={className} color={color} />
  }

  return <IconComponent size={size} className={className} color={color} />
}

// Re-export commonly used icons for direct use
export {
  Search, FileText, BookOpen, MapPin, Clock, Mail, Phone, ExternalLink,
  ChevronRight, AlertCircle, CheckCircle, Info, XCircle, Loader2, Inbox,
  Upload, Camera, ArrowLeft, ArrowRight, Grid3X3, List as ListIcon,
  Lock, Settings, Edit as EditIcon, BarChart3, Users, Filter,
}
