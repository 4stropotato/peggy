import {
  AlarmClock,
  AlertOctagon,
  Baby,
  BarChart3,
  Banknote,
  Bell,
  Bone,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Flame,
  Frown,
  HardDrive,
  Heart,
  HeartPulse,
  Home,
  Hospital,
  House,
  LayoutDashboard,
  Landmark,
  Leaf,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Meh,
  Menu,
  Moon,
  MoreHorizontal,
  Music,
  Phone,
  Pill,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  TriangleAlert,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

export function UiIcon({ icon: Icon, className = 'ui-icon', ...props }) {
  if (!Icon) return null
  return <Icon aria-hidden="true" className={className} {...props} />
}

export function ExpandIcon({ expanded, className = 'ui-icon' }) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return <UiIcon icon={Icon} className={className} />
}

export const ICON_STYLE_PRESETS = [
  {
    id: 'minimal-clean',
    label: 'Minimal Clean',
    description: 'Nav: House, ClipboardList, CircleDollarSign, Pill, MoreHorizontal.',
  },
  {
    id: 'friendly-rounded',
    label: 'Friendly Rounded',
    description: 'Nav: Home, ListChecks, Wallet, HeartPulse, SlidersHorizontal.',
  },
  {
    id: 'medical-premium',
    label: 'Medical Premium',
    description: 'Nav: LayoutDashboard, CheckSquare, Banknote, Stethoscope, Menu.',
  },
  {
    id: 'soft-duotone',
    label: 'Soft Duotone',
    description: 'Nav: same shapes as Minimal Clean with softer two-tone styling.',
  },
  {
    id: 'solid-modern',
    label: 'Solid Modern',
    description: 'Filled-look containers, bold modern vibe.',
  },
]

export function resolveIconStyle(style) {
  const value = String(style || '').trim()
  if (!value) return 'minimal-clean'
  if (value === 'clean') return 'minimal-clean'
  if (value === 'soft') return 'friendly-rounded'
  if (value === 'bold') return 'solid-modern'
  return value
}

export function getNavIcons(style) {
  const normalized = resolveIconStyle(style)
  if (normalized === 'friendly-rounded') {
    return {
      home: Home,
      tasks: ListChecks,
      money: Wallet,
      health: HeartPulse,
      more: SlidersHorizontal,
    }
  }
  if (normalized === 'medical-premium') {
    return {
      home: LayoutDashboard,
      tasks: CheckSquare,
      money: Banknote,
      health: Stethoscope,
      more: Menu,
    }
  }
  return {
    home: House,
    tasks: ClipboardList,
    money: CircleDollarSign,
    health: Pill,
    more: MoreHorizontal,
  }
}

export const THEME_ICONS = {
  dark: Sun,
  light: Moon,
}

export const APP_ICONS = {
  reminders: Bell,
  supplements: Pill,
  work: Briefcase,
  names: Sparkles,
  activity: CalendarDays,
  checkup: Hospital,
  tip: Lightbulb,
  overview: BarChart3,
  tasks: ClipboardList,
  benefits: CircleDollarSign,
  salary: Wallet,
  tax: BarChart3,
  warning: TriangleAlert,
  phone: Phone,
  script: MessageCircle,
  you: User,
  staff: User,
  info: BookOpen,
  photos: Camera,
  doctor: Stethoscope,
  contacts: Phone,
  backup: HardDrive,
}

const TOKEN_ICON_MAP = {
  '🤰': Baby,
  '🏥': Hospital,
  '👪': Users,
  '👶': Baby,
  '📋': ClipboardList,
  '💊': Pill,
  '🧠': Brain,
  '🦴': Bone,
  '🌿': Leaf,
  '⚡': Zap,
  '☀️': Sun,
  '🌅': Sun,
  '🌙': Moon,
  '🏢': Building2,
  '🏛️': Landmark,
  '💴': CircleDollarSign,
  '💰': CircleDollarSign,
  '📊': BarChart3,
  '🛒': ShoppingCart,
  '🧷': TriangleAlert,
  '🏪': Store,
  '🧾': Receipt,
  '⭐': Star,
  '🎵': Music,
  '📅': CalendarDays,
  '🆘': AlertOctagon,
  '🏠': House,
  '⏰': AlarmClock,
  '💡': Lightbulb,
  '📝': FileText,
  '📖': BookOpen,
  '📷': Camera,
  '👨‍⚕️': Stethoscope,
  '📞': Phone,
  '💬': MessageCircle,
  '💼': Briefcase,
  '⚠️': TriangleAlert,
  '🔔': Bell,
  '⋯': MoreHorizontal,
  '😊': Smile,
  '😐': Meh,
  '😢': Frown,
  '🤢': CircleAlert,
  '😴': Moon,
  '😤': Flame,
  '🥰': Heart,
  '😰': TriangleAlert,
}

export function getIconForToken(token) {
  return TOKEN_ICON_MAP[token] || Circle
}

export function TokenIcon({ token, className = 'ui-icon', ...props }) {
  const Icon = getIconForToken(token)
  return <UiIcon icon={Icon} className={className} {...props} />
}
