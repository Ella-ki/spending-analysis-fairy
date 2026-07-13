import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import type { HouseholdMembership, HouseholdRole } from "../../shared/types";
import { useAuth } from "../auth/AuthProvider";

type HouseholdContextValue = {
  membership: HouseholdMembership | null;
  isLoading: boolean;
  error: Error | null;
  createHousehold: (input: { name: string; role: HouseholdRole }) => Promise<void>;
  joinHousehold: (input: { joinCode: string; role: HouseholdRole }) => Promise<void>;
  refetch: () => Promise<unknown>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

type HouseholdProviderProps = {
  children: ReactNode;
};

type MembershipRow = {
  relationship_role: HouseholdRole;
  is_admin: boolean;
  households: {
    id: string;
    name: string;
    join_code: string;
    created_at: string;
  } | null;
};

export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const membershipQuery = useQuery({
    queryKey: ["household-membership", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HouseholdMembership | null> => {
      const { error: syncError } = await supabase.rpc("ensure_current_user");
      if (syncError) {
        throw syncError;
      }

      const { data, error } = await supabase
        .from("household_members")
        .select("relationship_role,is_admin,households(id,name,join_code,created_at)")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const row = data as MembershipRow | null;
      if (!row?.households) {
        return null;
      }

      return {
        household: row.households,
        relationship_role: row.relationship_role,
        is_admin: row.is_admin,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; role: HouseholdRole }) => {
      const { error } = await supabase.rpc("create_household", {
        household_name: input.name,
        member_role: input.role,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household-membership", userId] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (input: { joinCode: string; role: HouseholdRole }) => {
      const { error } = await supabase.rpc("join_household_by_code", {
        invite_code: input.joinCode,
        member_role: input.role,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household-membership", userId] });
    },
  });

  const value = useMemo<HouseholdContextValue>(
    () => ({
      membership: membershipQuery.data ?? null,
      isLoading: membershipQuery.isLoading,
      error: membershipQuery.error,
      createHousehold: createMutation.mutateAsync,
      joinHousehold: joinMutation.mutateAsync,
      refetch: membershipQuery.refetch,
    }),
    [
      createMutation.mutateAsync,
      joinMutation.mutateAsync,
      membershipQuery.data,
      membershipQuery.error,
      membershipQuery.isLoading,
      membershipQuery.refetch,
    ],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);

  if (!context) {
    throw new Error("useHousehold must be used inside HouseholdProvider");
  }

  return context;
}
