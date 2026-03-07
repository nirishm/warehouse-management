import { z } from 'zod';

export const updateDocumentConfigSchema = z.object({
  company_name: z.string().min(1),
  company_address: z.string().optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_email: z.string().email().optional().nullable().or(z.literal('')),
  company_gstin: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  footer_text: z.string().optional().nullable(),
});

export type UpdateDocumentConfigInput = z.infer<typeof updateDocumentConfigSchema>;

export interface DocumentConfig {
  id: string;
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_gstin: string | null;
  logo_url: string | null;
  footer_text: string | null;
  updated_by: string | null;
  updated_at: string;
}
