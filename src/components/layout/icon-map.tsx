import {
  Package, Truck, ShoppingCart, Receipt, BarChart3,
  AlertTriangle, Users, ScrollText, MapPin, Wheat,
  Settings, Home, LogOut, Menu, X, ChevronDown,
  CreditCard, Bell, FileText, Layers, RotateCcw,
  Upload, QrCode, SlidersHorizontal, PackageCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Package, Truck, ShoppingCart, Receipt, BarChart3,
  AlertTriangle, Users, ScrollText, MapPin, Wheat,
  Settings, Home, LogOut, Menu, X, ChevronDown,
  CreditCard, Bell, FileText, Layers, RotateCcw,
  Upload, QrCode, SlidersHorizontal, PackageCheck,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Package;
}
