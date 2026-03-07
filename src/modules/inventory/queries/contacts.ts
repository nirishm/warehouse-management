import { createTenantClient } from '@/core/db/tenant-query';
import type { CreateContactInput, UpdateContactInput, Contact, ContactType } from '../validations/contact';

export async function listContacts(
  schemaName: string,
  type?: ContactType
): Promise<Contact[]> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list contacts: ${error.message}`);
  return (data ?? []) as Contact[];
}

export async function getContactById(
  schemaName: string,
  id: string
): Promise<Contact | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get contact: ${error.message}`);
  }
  return data as Contact;
}

export async function createContact(
  schemaName: string,
  input: CreateContactInput
): Promise<Contact> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('contacts')
    .insert({
      name: input.name,
      type: input.type,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data as Contact;
}

export async function updateContact(
  schemaName: string,
  id: string,
  input: UpdateContactInput & { is_active?: boolean }
): Promise<Contact> {
  const client = createTenantClient(schemaName);

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.address !== undefined) updateData.address = input.address || null;
  if ('is_active' in input) updateData.is_active = input.is_active;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('contacts')
    .update(updateData)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return data as Contact;
}

export async function softDeleteContact(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}
