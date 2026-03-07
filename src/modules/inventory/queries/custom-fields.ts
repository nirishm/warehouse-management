import { createTenantClient } from '@/core/db/tenant-query';
import type {
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CustomFieldDefinition,
} from '../validations/custom-field';

export async function listCustomFieldDefinitions(
  schemaName: string,
  entityType?: string
): Promise<CustomFieldDefinition[]> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('custom_field_definitions')
    .select('*')
    .order('entity_type')
    .order('sort_order');

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;

  if (error)
    throw new Error(
      `Failed to list custom field definitions: ${error.message}`
    );
  return (data ?? []) as CustomFieldDefinition[];
}

export async function createCustomFieldDefinition(
  schemaName: string,
  input: CreateCustomFieldInput
): Promise<CustomFieldDefinition> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('custom_field_definitions')
    .insert({
      entity_type: input.entity_type,
      field_key: input.field_key,
      field_label: input.field_label,
      field_type: input.field_type,
      options: input.options ?? null,
      is_required: input.is_required,
      sort_order: input.sort_order,
    })
    .select('*')
    .single();

  if (error)
    throw new Error(
      `Failed to create custom field definition: ${error.message}`
    );
  return data as CustomFieldDefinition;
}

export async function updateCustomFieldDefinition(
  schemaName: string,
  id: string,
  input: UpdateCustomFieldInput
): Promise<CustomFieldDefinition> {
  const client = createTenantClient(schemaName);

  const updateData: Record<string, unknown> = {};
  if (input.entity_type !== undefined) updateData.entity_type = input.entity_type;
  if (input.field_key !== undefined) updateData.field_key = input.field_key;
  if (input.field_label !== undefined) updateData.field_label = input.field_label;
  if (input.field_type !== undefined) updateData.field_type = input.field_type;
  if (input.options !== undefined) updateData.options = input.options;
  if (input.is_required !== undefined) updateData.is_required = input.is_required;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await client
    .from('custom_field_definitions')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error)
    throw new Error(
      `Failed to update custom field definition: ${error.message}`
    );
  return data as CustomFieldDefinition;
}

export async function deleteCustomFieldDefinition(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client
    .from('custom_field_definitions')
    .delete()
    .eq('id', id);

  if (error)
    throw new Error(
      `Failed to delete custom field definition: ${error.message}`
    );
}

export async function getCustomFieldsForEntity(
  schemaName: string,
  entityType: string
): Promise<CustomFieldDefinition[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('custom_field_definitions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('sort_order');

  if (error)
    throw new Error(
      `Failed to get custom fields for entity: ${error.message}`
    );
  return (data ?? []) as CustomFieldDefinition[];
}
