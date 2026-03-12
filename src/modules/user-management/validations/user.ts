import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
  displayName: z.string().min(1).max(255).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
});

export const updateUserPermissionsSchema = z.object({
  permissions: z.record(z.string(), z.boolean()).nullable(),
});

export const updateUserLocationsSchema = z.object({
  locationIds: z.array(z.string().uuid()),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;
export type UpdateUserLocationsInput = z.infer<typeof updateUserLocationsSchema>;
