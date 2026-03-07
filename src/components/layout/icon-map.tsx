import {
  Package, Truck, ShoppingCart, Receipt, BarChart3,
  AlertTriangle, Users, ScrollText, MapPin, Wheat,
  Settings, Home, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Package, Truck, ShoppingCart, Receipt, BarChart3,
  AlertTriangle, Users, ScrollText, MapPin, Wheat,
  Settings, Home, LogOut, Menu, X, ChevronDown,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Package;
}
