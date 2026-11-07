'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseTemplateForm, templateErrorCopy } from '@/lib/saved-templates';
import { isUuid } from '@/lib/subscriptions';

const PATH = '/dashboard/templates';

function go(kind: 'error' | 'ok', message: string): never {
  redirect(`${PATH}?${kind}=${encodeURIComponent(message)}`);
}

async function session() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return supabase;
}

/** The database checks the plan limit, the name, and every field again, so this is only a friendly first check. */
export async function createTemplateAction(formData: FormData) {
  const supabase = await session();
  const parsed = parseTemplateForm(Object.fromEntries(formData));
  if (!parsed.ok) go('error', parsed.error);
  const { error } = await supabase.rpc('save_template', { p_name: parsed.value.name, p_summary: parsed.value.summary, p_fields: parsed.value.fields });
  if (error) go('error', templateErrorCopy(error));
  go('ok', 'Template saved. You can use it from My templates when you create a new agreement.');
}

export async function deleteTemplateAction(formData: FormData) {
  const supabase = await session();
  const id = String(formData.get('template_id') ?? '');
  if (!isUuid(id)) go('error', 'That template could not be found.');
  const { error } = await supabase.rpc('delete_template', { p_id: id });
  if (error) go('error', templateErrorCopy(error));
  go('ok', 'Template deleted. Agreements you already created from it are not affected.');
}
