import { moduleRegistry } from '@/core/modules/registry';
import { inventoryManifest } from './inventory/manifest';
import { dispatchManifest } from './dispatch/manifest';
import { purchaseManifest } from './purchase/manifest';
import { saleManifest } from './sale/manifest';
import { analyticsManifest } from './analytics/manifest';
import { shortageTrackingManifest } from './shortage-tracking/manifest';
import { userManagementManifest } from './user-management/manifest';
import { auditTrailManifest } from './audit-trail/manifest';

// Register all modules
moduleRegistry.register(inventoryManifest);
moduleRegistry.register(dispatchManifest);
moduleRegistry.register(purchaseManifest);
moduleRegistry.register(saleManifest);
moduleRegistry.register(analyticsManifest);
moduleRegistry.register(shortageTrackingManifest);
moduleRegistry.register(userManagementManifest);
moduleRegistry.register(auditTrailManifest);

export {
  inventoryManifest,
  dispatchManifest,
  purchaseManifest,
  saleManifest,
  analyticsManifest,
  shortageTrackingManifest,
  userManagementManifest,
  auditTrailManifest,
};
