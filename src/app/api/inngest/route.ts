import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';

// Inngest serve handler — functions will be registered here as modules are built.
// GET: used by the Inngest dev server UI to introspect registered functions.
// POST: used by Inngest to deliver events for function execution.
const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});

export { GET, POST, PUT };
