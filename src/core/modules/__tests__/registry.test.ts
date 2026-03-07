import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../registry';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  it('registers and retrieves a module', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: 'Track stock',
      icon: 'Package', dependencies: [], permissions: ['canViewStock'],
      navItems: [{ label: 'Stock', href: 'inventory', icon: 'Package' }],
    });
    expect(registry.get('inventory')).toBeDefined();
    expect(registry.get('inventory')!.name).toBe('Inventory');
  });

  it('returns enabled modules respecting dependencies', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: '', icon: 'Package',
      dependencies: [], permissions: [], navItems: [],
    });
    registry.register({
      id: 'dispatch', name: 'Dispatch', description: '', icon: 'Truck',
      dependencies: ['inventory'], permissions: [], navItems: [],
    });

    const enabled = registry.getEnabledModules(['inventory', 'dispatch']);
    expect(enabled).toHaveLength(2);

    const partial = registry.getEnabledModules(['dispatch']);
    expect(partial).toHaveLength(0);
  });

  it('builds nav items filtered by permissions', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: '', icon: 'Package',
      dependencies: [], permissions: [],
      navItems: [
        { label: 'Stock', href: 'inventory', icon: 'Package', permission: 'canViewStock' },
        { label: 'Locations', href: 'locations', icon: 'MapPin', permission: 'canManageLocations' },
      ],
    });

    const navItems = registry.getNavItems(
      ['inventory'],
      { canViewStock: true, canManageLocations: false } as Record<string, boolean>
    );
    expect(navItems).toHaveLength(1);
    expect(navItems[0].label).toBe('Stock');
  });
});
