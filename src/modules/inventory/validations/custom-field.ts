import { z } from 'zod';

export const ENTITY_TYPES = [
  'dispatch',
  'purchase',
  'sale',
  'commodity',
  'location',
  'contact',
  'dispatch_item',
  'purchase_item',
  'sale_item',
] as const;

export const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];

export const createCustomFieldSchema = z
  .object({
    entity_type: z.enum(ENTITY_TYPES),
    field_key: z
      .string()
      .min(1, 'Field key is required')
      .regex(
        /^[a-z0-9_]+$/,
        'Field key must be lowercase alphanumeric with underscores'
      ),
    field_label: z.string().min(1, 'Field label is required'),
    field_type: z.enum(FIELD_TYPES),
    options: z.array(z.string()).optional(),
    is_required: z.boolean().default(false),
    sort_order: z.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.field_type === 'select' || data.field_type === 'multiselect') {
        return data.options && data.options.length > 0;
      }
      return true;
    },
    {
      message: 'Options are required for select and multiselect field types',
      path: ['options'],
    }
  );

export const updateCustomFieldSchema = z
  .object({
    entity_type: z.enum(ENTITY_TYPES).optional(),
    field_key: z
      .string()
      .min(1, 'Field key is required')
      .regex(
        /^[a-z0-9_]+$/,
        'Field key must be lowercase alphanumeric with underscores'
      )
      .optional(),
    field_label: z.string().min(1, 'Field label is required').optional(),
    field_type: z.enum(FIELD_TYPES).optional(),
    options: z.array(z.string()).optional(),
    is_required: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.field_type === 'select' || data.field_type === 'multiselect') {
        return data.options && data.options.length > 0;
      }
      return true;
    },
    {
      message: 'Options are required for select and multiselect field types',
      path: ['options'],
    }
  );

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

export interface CustomFieldDefinition {
  id: string;
  entity_type: EntityType;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
