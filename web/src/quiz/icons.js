import {
  Baby,
  Briefcase,
  Calculator,
  Code,
  Gift,
  GraduationCap,
  House,
  Map as MapIcon,
  MapPin,
  Palette,
  School,
  Shuffle,
  Smile,
  Sparkles,
  Telescope,
  Wallet,
  Wrench,
} from 'lucide-react';

const ICONS = {
  'age-6-9': Baby,
  'age-10-13': Smile,
  'age-14-17': GraduationCap,
  'age-18-plus': Briefcase,
  build: Wrench,
  code: Code,
  draw: Palette,
  explore: Telescope,
  numbers: Calculator,
  'format-offline': School,
  'format-online': House,
  'format-any': Shuffle,
  'price-free': Gift,
  'price-any': Wallet,
  'distance-near': MapPin,
  'distance-any': MapIcon,
};

// Emoji з quiz.json в UI не використовуємо — SVG-іконки за id варіанта
export function quizIcon(optionId) {
  return ICONS[optionId] ?? Sparkles;
}
