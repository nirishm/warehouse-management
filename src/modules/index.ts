import { registry } from '@/core/modules/registry';

import { inventoryManifest } from './inventory/manifest';
import { saleManifest } from './sale/manifest';
import { purchaseManifest } from './purchase/manifest';
import { transferManifest } from './transfer/manifest';
import { adjustmentsManifest } from './adjustments/manifest';
import { userManagementManifest } from './user-management/manifest';
import { auditTrailManifest } from './audit-trail/manifest';
import { stockAlertsManifest } from './stock-alerts/manifest';
import { analyticsManifest } from './analytics/manifest';
import { shortageTrackingManifest } from './shortage-tracking/manifest';
import { paymentsManifest } from './payments/manifest';

registry.register(inventoryManifest);
registry.register(saleManifest);
registry.register(purchaseManifest);
registry.register(transferManifest);
registry.register(adjustmentsManifest);
registry.register(userManagementManifest);
registry.register(auditTrailManifest);
registry.register(stockAlertsManifest);
registry.register(analyticsManifest);
registry.register(shortageTrackingManifest);
registry.register(paymentsManifest);

export { registry };
