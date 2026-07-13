import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { Category } from "../../shared/types";

export function useCategories(householdId?: string) {
  return useQuery({
    queryKey: ["categories", householdId],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,household_id,name,color,icon,is_default,sort_order")
        .or(`household_id.is.null,household_id.eq.${householdId}`)
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Category[];
    },
  });
}
