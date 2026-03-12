import { moduleRegistry } from '@/core/modules/registry';
import { inventoryManifest } from './inventory/manifest';
import { dispatchManifest } from './dispatch/manifest';
import { purchaseManifest } from './purchase/manifest';
import { saleManifest } from './sale/manifest';
import { analyticsManifest } from './analytics/manifest';
// NOTE: shortage_tracking, user_management, audit_trail use underscore IDs.
// These are stored in tenants.enabled_modules and must NOT be renamed
// without a coordinated DB migration to update all tenant rows.
import { shortageTrackingManifest } from './shortage-tracking/manifest';
import { userManagementManifest } from './user-management/manifest';
import { auditTrailManifest } from './audit-trail/manifest';
import { paymentsManifest } from './payments/manifest';
import { stockAlertsManifest } from './stock-alerts/manifest';
import { documentGenManifest } from './document-gen/manifest';
import { lotTrackingManifest } from './lot-tracking/manifest';
import { returnsManifest } from './returns/manifest';
import { bulkImportManifest } from './bulk-import/manifest';
import { barcodeManifest } from './barcode/manifest';
import { adjustmentsManifest } from './adjustments/manifest';

// Register all modules
moduleRegistry.register(inventoryManifest);
moduleRegistry.register(dispatchManifest);
moduleRegistry.register(purchaseManifest);
moduleRegistry.register(saleManifest);
moduleRegistry.register(analyticsManifest);
moduleRegistry.register(shortageTrackingManifest);
moduleRegistry.register(userManagementManifest);
moduleRegistry.register(auditTrailManifest);
moduleRegistry.register(paymentsManifest);
moduleRegistry.register(stockAlertsManifest);
moduleRegistry.register(documentGenManifest);
moduleRegistry.register(lotTrackingManifest);
moduleRegistry.register(returnsManifest);
moduleRegistry.register(bulkImportManifest);
moduleRegistry.register(barcodeManifest);
moduleRegistry.register(adjustmentsManifest);
