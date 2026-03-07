import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export type Message = {
  role: string;
  content: string;
};

const ADMIN_PRINCIPAL =
  "qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae";

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
  const data = useMemo(
    () => identity?.getPrincipal().toText() === ADMIN_PRINCIPAL,
    [identity],
  );
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
      return actor.setApiKey(key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeyStatus"] });
    },
  });
}
