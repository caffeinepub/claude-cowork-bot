import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export type Message = {
  role: string;
  content: string;
};

export type Thread = {
  id: string;
  name: string;
  createdAt: number;
};

const ADMIN_PRINCIPALS = new Set([
  "qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae",
  "wnhau-de23g-57rge-d7lv6-fnzxf-hvkpf-ua53k-mfzgw-flp7b-2voe2-lqe",
  "qqo3r-gvrky-iiz2l-23uu5-im2b4-omnu7-ch65g-sqjho-vak5f-cd42y-iae",
  "f7ttf-mk7fq-uljq2-feawb-uaaps-6ddxo-hvyby-jttw2-5oi6f-pftnc-iqe",
]);

const STORAGE_KEY_THREADS = "ccbot_threads";
const STORAGE_KEY_MESSAGES = (threadId: string) => `ccbot_messages_${threadId}`;
const STORAGE_KEY_ACTIVE_THREAD = "ccbot_active_thread";
const STORAGE_KEY_SYSTEM_PROMPT = "ccbot_system_prompt";
const STORAGE_KEY_MEMORY = "ccbot_memory";

// ---- Thread storage helpers ----
export function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THREADS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]): void {
  localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
}

export function loadMessages(threadId: string): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES(threadId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMessages(threadId: string, messages: Message[]): void {
  localStorage.setItem(
    STORAGE_KEY_MESSAGES(threadId),
    JSON.stringify(messages),
  );
}

export function loadActiveThreadId(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_THREAD);
}

export function saveActiveThreadId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_THREAD, id);
}

export function loadSystemPrompt(): string {
  return localStorage.getItem(STORAGE_KEY_SYSTEM_PROMPT) ?? "";
}

export function saveSystemPromptLocal(prompt: string): void {
  localStorage.setItem(STORAGE_KEY_SYSTEM_PROMPT, prompt);
}

export function loadMemory(): string {
  return localStorage.getItem(STORAGE_KEY_MEMORY) ?? "";
}

export function saveMemoryLocal(memory: string): void {
  localStorage.setItem(STORAGE_KEY_MEMORY, memory);
}

// ---- React Query hooks ----

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
      const result = await actor.sendMessage(message);
      // Handle both { ok, err } and { __kind__: "ok"|"err" } shapes
      if ("__kind__" in result) {
        if (result.__kind__ === "ok")
          return { ok: (result as { __kind__: "ok"; ok: string }).ok };
        return { err: (result as { __kind__: "err"; err: string }).err };
      }
      return result as { ok: string } | { err: string };
    },
  });
}

export function useClearHistory() {
  const { actor } = useActor();
  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.clearHistory();
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
      // Normalize __kind__ shape
      if ("__kind__" in result) {
        if ((result as { __kind__: string }).__kind__ === "ok")
          return { ok: null };
        return { err: (result as { __kind__: "err"; err: string }).err };
      }
      const r = result as { ok: null } | { err: string };
      if ("err" in r && r.err.toLowerCase().includes("unauthorized")) {
        return {
          err: "Backend admin registration required. Please redeploy the app to register your principal on the backend.",
        };
      }
      return r;
    },
    onSuccess: (result) => {
      if ("ok" in result) {
        queryClient.invalidateQueries({ queryKey: ["apiKeyStatus"] });
      }
    },
  });
}
