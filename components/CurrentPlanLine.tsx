import { requireSession } from '@/lib/data';
import { currentPlanLine } from '@/lib/plan-status';

/** Shows the plan you have right now, read from the database. Shows nothing if it cannot be read. */
export async function CurrentPlanLine() {
  const { supabase, profile } = await requireSession();
  const { data } = await supabase.rpc('my_subscription');
  const line = currentPlanLine(data as Parameters<typeof currentPlanLine>[0], profile.timezone);
  if (!line) return null;
  return <p className="text-base font-semibold text-navy">{line}</p>;
}
