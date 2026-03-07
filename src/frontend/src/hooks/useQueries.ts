import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export type Message = {
  role: string;
  content: string;
};

const ADMIN_PRINCIPALS = new Set([
  "qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae",
  "wnhau-de23g-57rge-d7lv6-fnzxf-hvkpf-ua53k-mfzgw-flp7b-2voe2-lqe",
  "qqo3r-gvrky-iiz2l-23uu5-im2b4-omnu7-ch65g-sqjho-vak5f-cd42y-iae",
  "f7ttf-mk7fq-uljq2-feawb-uaaps-6ddxo-hvyby-jttw2-5oi6f-pftnc-iqe",
]);

export function useGetHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["history"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHistory();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useIsAdmin() {
  const { identity } = useInternetIdentity();
  const data = useMemo(() => {
    const principal = identity?.getPrincipal().toText();
    return principal ? ADMIN_PRINCIPALS.has(principal) : false;
  }, [identity]);
  return { data };
}

export function useGetApiKeyStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["apiKeyStatus"],
    queryFn: async () => {
      if (!actor) return "not_set";
      return actor.getApiKeyStatus();
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  return useMutation<{ ok: string } | { err: string }, Error, string>({
    mutationFn: async (message: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendMessage(message);
    },
  });
}

export function useClearHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.clearHistory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useSetApiKey() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<{ ok: null } | { err: string }, Error, string>({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.setApiKey(key);
      // Surface a clear, actionable error when the backend rejects due to admin registration
      if (
        "err" in result &&
        result.err.toLowerCase().includes("unauthorized")
      ) {
        return {
          err: "Backend admin registration required. Your principal is in the admin list but the canister does not recognise it yet. Please redeploy the app to fix this permanently.",
        };
      }
      return result;
    },
    onSuccess: (result) => {
      if ("ok" in result) {
        queryClient.invalidateQueries({ queryKey: ["apiKeyStatus"] });
      }
    },
  });
}
