import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Bot,
  Brain,
  Bug,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Key,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  type Message,
  type Thread,
  loadActiveThreadId,
  loadMemory,
  loadMessages,
  loadSystemPrompt,
  loadThreads,
  saveActiveThreadId,
  saveMemoryLocal,
  saveMessages,
  saveSystemPromptLocal,
  saveThreads,
  useClearHistory,
  useGetApiKeyStatus,
  useIsAdmin,
  useSendMessage,
  useSetApiKey,
} from "./hooks/useQueries";

// ---- Thread helpers ----
function createThread(name: string): Thread {
  return { id: `thread_${Date.now()}`, name, createdAt: Date.now() };
}

// ---- Settings Sheet ----
function SettingsSheet({
  activeThreadId,
  onClearCurrentThread,
}: {
  activeThreadId: string | null;
  onClearCurrentThread: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const { data: keyStatus, isLoading: statusLoading } = useGetApiKeyStatus();
  const setApiKeyMutation = useSetApiKey();
  const clearHistoryMutation = useClearHistory();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { identity } = useInternetIdentity();

  const [systemPrompt, setSystemPrompt] = useState(loadSystemPrompt);
  const [memory, setMemory] = useState(loadMemory);
  const [savingSP, setSavingSP] = useState(false);
  const [savingMem, setSavingMem] = useState(false);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    const result = await setApiKeyMutation.mutateAsync(apiKey.trim());
    if ("ok" in result) {
      toast.success("Your API key saved");
      setApiKey("");
    } else if (result.err.toLowerCase().includes("backend admin")) {
      toast.error(result.err, { duration: 10000 });
    } else {
      toast.error(`Failed to save API key: ${result.err}`);
    }
  };

  const handleClearHistory = async () => {
    await clearHistoryMutation.mutateAsync();
    if (activeThreadId) {
      saveMessages(activeThreadId, []);
    }
    onClearCurrentThread();
    toast.success("Conversation history cleared");
    setClearConfirmOpen(false);
  };

  const handleSaveSystemPrompt = async () => {
    setSavingSP(true);
    saveSystemPromptLocal(systemPrompt);
    setTimeout(() => {
      setSavingSP(false);
      toast.success("System prompt saved");
    }, 300);
  };

  const handleSaveMemory = async () => {
    setSavingMem(true);
    saveMemoryLocal(memory);
    setTimeout(() => {
      setSavingMem(false);
      toast.success("Memory saved");
    }, 300);
  };

  const keyStatusDisplay = () => {
    if (statusLoading) return null;
    if (!keyStatus || keyStatus === "not_set") {
      return (
        <div className="flex items-center gap-1.5 text-destructive text-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Not configured</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-primary text-sm">
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="font-mono text-xs">
          {keyStatus.replace("set:", "")}
        </span>
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-ocid="settings.open_modal_button"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        data-ocid="settings.sheet"
        className="w-[340px] sm:w-[420px] bg-card border-border overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="font-mono text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8 pb-8">
          {/* API Key Section */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-primary" />
                Anthropic API Key
              </h3>
              <p className="text-xs text-muted-foreground">
                Your key is stored securely in the canister.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Current status
                </span>
                {keyStatusDisplay()}
              </div>
              <div className="relative">
                <Input
                  data-ocid="settings.input"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono text-sm bg-background border-border focus-visible:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                data-ocid="settings.save_button"
                onClick={handleSaveKey}
                disabled={!apiKey.trim() || setApiKeyMutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm"
              >
                {setApiKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {setApiKeyMutation.isPending ? "Saving..." : "Save API Key"}
              </Button>
            </div>
          </div>

          {/* System Prompt Section */}
          {isAdmin && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    System Prompt
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Custom instructions given to Claude on every message.
                  </p>
                </div>
                <Textarea
                  data-ocid="settings.textarea"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={4}
                  className="text-sm bg-background border-border resize-none focus-visible:ring-primary/50 font-mono"
                />
                <Button
                  data-ocid="settings.system_prompt.save_button"
                  onClick={handleSaveSystemPrompt}
                  disabled={savingSP}
                  size="sm"
                  className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-mono text-xs"
                  variant="outline"
                >
                  {savingSP ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  {savingSP ? "Saving..." : "Save System Prompt"}
                </Button>
              </div>
            </>
          )}

          {/* Memory Section */}
          {isAdmin && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-primary" />
                    Persistent Memory
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Key facts about you — included in every conversation for
                    context.
                  </p>
                </div>
                <Textarea
                  data-ocid="settings.memory.textarea"
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  placeholder="My name is..., I work on..., I prefer concise responses..."
                  rows={4}
                  className="text-sm bg-background border-border resize-none focus-visible:ring-primary/50 font-body"
                />
                <Button
                  data-ocid="settings.memory.save_button"
                  onClick={handleSaveMemory}
                  disabled={savingMem}
                  size="sm"
                  className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-mono text-xs"
                  variant="outline"
                >
                  {savingMem ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  {savingMem ? "Saving..." : "Save Memory"}
                </Button>
              </div>
            </>
          )}

          <Separator className="bg-border" />

          {/* Conversation Section */}
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-primary" />
                Conversation
              </h3>
              <p className="text-xs text-muted-foreground">
                Clear current thread history.
              </p>
            </div>

            <AlertDialog
              open={clearConfirmOpen}
              onOpenChange={setClearConfirmOpen}
            >
              <Button
                data-ocid="chat.clear_button"
                variant="destructive"
                className="w-full font-mono text-sm"
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Thread History
              </Button>
              <AlertDialogContent
                data-ocid="chat.dialog"
                className="bg-card border-border"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-mono text-foreground">
                    Clear thread history?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete the conversation history for
                    this thread.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="chat.cancel_button"
                    className="font-mono bg-secondary border-border hover:bg-accent"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="chat.confirm_button"
                    onClick={handleClearHistory}
                    disabled={clearHistoryMutation.isPending}
                    className="font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearHistoryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {clearHistoryMutation.isPending
                      ? "Clearing..."
                      : "Clear History"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Debug Section */}
          <Separator className="bg-border" />
          <div data-ocid="settings.debug.panel" className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bug className="h-3.5 w-3.5 text-primary" />
              Debug Info
            </h3>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  Login status
                </span>
                <span
                  className={`text-xs font-mono font-medium ${identity ? "text-primary" : "text-muted-foreground"}`}
                >
                  {identity ? "Logged in" : "Not logged in"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  Admin status
                </span>
                <span
                  className={`text-xs font-mono font-medium ${isAdmin ? "text-primary" : "text-muted-foreground"}`}
                >
                  {isAdmin ? "Admin" : "Not admin"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  API key status
                </span>
                <span className="text-xs font-mono text-foreground/70 max-w-[160px] truncate text-right">
                  {statusLoading ? "loading..." : (keyStatus ?? "undefined")}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  Principal
                </span>
                <span className="text-xs font-mono text-foreground/70 break-all text-right">
                  {identity ? identity.getPrincipal().toText() : "Anonymous"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Typing Indicator ----
function TypingIndicator() {
  return (
    <motion.div
      data-ocid="chat.loading_state"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-assistant-bubble border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5 h-5">
          <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full inline-block" />
          <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full inline-block" />
          <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full inline-block" />
        </div>
      </div>
    </motion.div>
  );
}

// ---- Message Bubble ----
function MessageBubble({
  message,
  index,
}: { message: Message; index: number }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      data-ocid={`chat.item.${index + 1}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-start gap-3 px-4 py-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-primary/20 border border-primary/40"
            : "bg-primary/10 border border-primary/30"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[75%] space-y-1 flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        {!isUser && (
          <span className="text-[10px] font-mono text-primary/70 px-1">
            Claude
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-user-bubble text-user-bubble-foreground rounded-tr-sm shadow-glow-sm"
              : "bg-assistant-bubble text-assistant-bubble-foreground rounded-tl-sm border border-border"
          }`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}

// ---- Empty State ----
function EmptyState() {
  return (
    <motion.div
      data-ocid="chat.empty_state"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse-glow">
          <span className="text-3xl">🤖</span>
        </div>
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary/80 animate-pulse" />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-foreground/80 text-base font-medium">
          Start a conversation
        </p>
        <p className="text-muted-foreground text-sm max-w-xs">
          Ask Claude anything — responses run via HTTP outcalls on the Internet
          Computer.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {["Explain ICP canisters", "Help debug code", "Write an email"].map(
          (s) => (
            <Badge
              key={s}
              variant="outline"
              className="text-xs border-border text-muted-foreground font-mono cursor-default hover:border-primary/40 transition-colors"
            >
              {s}
            </Badge>
          ),
        )}
      </div>
    </motion.div>
  );
}

// ---- Login Prompt ----
function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 px-4">
      <p className="text-sm text-muted-foreground font-mono">
        Login to start chatting
      </p>
      <Button
        onClick={onLogin}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm gap-2"
      >
        <LogIn className="h-4 w-4" />
        Connect with Internet Identity
      </Button>
    </div>
  );
}

// ---- Thread Sidebar ----
function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
  collapsed,
  onToggleCollapse,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onRenameThread: (id: string, name: string) => void;
  onDeleteThread: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startRename = (thread: Thread) => {
    setRenamingId(thread.id);
    setRenameValue(thread.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameThread(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <>
      <motion.aside
        data-ocid="threads.panel"
        animate={{ width: collapsed ? 0 : 220 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-none overflow-hidden bg-sidebar border-r border-sidebar-border flex flex-col h-full"
      >
        <div className="flex items-center justify-between px-3 h-14 border-b border-sidebar-border flex-none">
          <span className="font-mono text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">
            Threads
          </span>
          <div className="flex items-center gap-1">
            <Button
              data-ocid="threads.add_button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={onCreateThread}
              aria-label="New thread"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              data-ocid="threads.toggle"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {threads.map((thread, idx) => (
              <button
                type="button"
                key={thread.id}
                data-ocid={`threads.item.${idx + 1}`}
                className={`w-full group flex items-center gap-1.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${
                  activeThreadId === thread.id
                    ? "bg-primary/10 text-primary border-l-2 border-primary shadow-glow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent"
                }`}
                onClick={() => onSelectThread(thread.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                <span className="flex-1 text-xs font-mono truncate">
                  {thread.name}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-ocid={`threads.dropdown_menu.${idx + 1}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-primary/20 transition-all"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Thread options"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-ocid="threads.dropdown_menu"
                    align="end"
                    className="bg-popover border-border min-w-[120px]"
                  >
                    <DropdownMenuItem
                      data-ocid={`threads.edit_button.${idx + 1}`}
                      className="text-xs font-mono gap-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(thread);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-ocid={`threads.delete_button.${idx + 1}`}
                      className="text-xs font-mono gap-2 text-destructive focus:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(thread.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            ))}
            {threads.length === 0 && (
              <div
                data-ocid="threads.empty_state"
                className="px-2 py-4 text-center"
              >
                <p className="text-xs text-muted-foreground font-mono">
                  No threads yet
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.aside>

      {/* Expand tab — only visible when collapsed */}
      {collapsed && (
        <button
          type="button"
          data-ocid="threads.toggle"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="flex-none w-6 bg-sidebar border-r border-sidebar-border hover:bg-primary/10 transition-colors flex items-center justify-center text-primary/70 hover:text-primary"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Rename dialog */}
      <Dialog
        open={!!renamingId}
        onOpenChange={(open) => !open && setRenamingId(null)}
      >
        <DialogContent
          data-ocid="threads.dialog"
          className="bg-card border-border sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground">
              Rename Thread
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-muted-foreground font-mono">
              Thread name
            </Label>
            <Input
              data-ocid="threads.input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              className="mt-1.5 bg-background border-border font-mono text-sm focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              data-ocid="threads.cancel_button"
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setRenamingId(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="threads.confirm_button"
              size="sm"
              className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={commitRename}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent
          data-ocid="threads.delete.dialog"
          className="bg-card border-border"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground">
              Delete thread?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the thread and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="threads.delete.cancel_button"
              className="font-mono bg-secondary border-border hover:bg-accent"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="threads.delete.confirm_button"
              onClick={() => {
                if (deleteConfirmId) onDeleteThread(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
              className="font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- New Thread Dialog ----
function NewThreadDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setName("");
        onOpenChange(o);
      }}
    >
      <DialogContent
        data-ocid="threads.new.dialog"
        className="bg-card border-border sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-foreground">
            New Thread
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-xs text-muted-foreground font-mono">
            Thread name
          </Label>
          <Input
            data-ocid="threads.new.input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Project A, Blog ideas..."
            className="mt-1.5 bg-background border-border font-mono text-sm focus-visible:ring-primary/50"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            data-ocid="threads.new.cancel_button"
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            data-ocid="threads.new.confirm_button"
            size="sm"
            disabled={!name.trim()}
            className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Export helper ----
function exportThread(thread: Thread, messages: Message[]) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `${thread.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${date}.md`;
  const content = [
    `# ${thread.name}`,
    "",
    ...messages.map((m) =>
      m.role === "user" ? `**You:** ${m.content}` : `**Claude:** ${m.content}`,
    ),
  ].join("\n\n");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Main App ----
export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const isLoggedIn = !!identity;

  const sendMessageMutation = useSendMessage();
  const clearHistoryMutation = useClearHistory();

  // Thread state
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() =>
    loadActiveThreadId(),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newThreadDialogOpen, setNewThreadDialogOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize: ensure at least a General thread exists
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (threads.length === 0) {
      const general = createThread("General");
      const updated = [general];
      setThreads(updated);
      saveThreads(updated);
      setActiveThreadId(general.id);
      saveActiveThreadId(general.id);
    } else if (
      !activeThreadId ||
      !threads.find((t) => t.id === activeThreadId)
    ) {
      const first = threads[0];
      setActiveThreadId(first.id);
      saveActiveThreadId(first.id);
    }
  }, []);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      setMessages(loadMessages(activeThreadId));
    }
  }, [activeThreadId]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message/send changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  // Thread management
  const handleCreateThread = (name: string) => {
    const thread = createThread(name);
    const updated = [...threads, thread];
    setThreads(updated);
    saveThreads(updated);
    setActiveThreadId(thread.id);
    saveActiveThreadId(thread.id);
    setMessages([]);
    clearHistoryMutation.mutate();
  };

  const handleSelectThread = (id: string) => {
    if (id === activeThreadId) return;
    setActiveThreadId(id);
    saveActiveThreadId(id);
    clearHistoryMutation.mutate();
  };

  const handleRenameThread = (id: string, name: string) => {
    const updated = threads.map((t) => (t.id === id ? { ...t, name } : t));
    setThreads(updated);
    saveThreads(updated);
  };

  const handleDeleteThread = (id: string) => {
    const updated = threads.filter((t) => t.id !== id);
    setThreads(updated);
    saveThreads(updated);
    localStorage.removeItem(`ccbot_messages_${id}`);
    if (activeThreadId === id) {
      const next = updated[0] ?? null;
      setActiveThreadId(next?.id ?? null);
      if (next) {
        saveActiveThreadId(next.id);
        setMessages(loadMessages(next.id));
        clearHistoryMutation.mutate();
      } else {
        setMessages([]);
      }
    }
  };

  const handleClearCurrentThread = () => {
    setMessages([]);
  };

  // Auto-grow textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending || !activeThreadId) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const result = await sendMessageMutation.mutateAsync(trimmed);
      if ("ok" in result) {
        const assistantMsg: Message = { role: "assistant", content: result.ok };
        const finalMessages = [...updatedMessages, assistantMsg];
        setMessages(finalMessages);
        saveMessages(activeThreadId, finalMessages);
      } else {
        const errMsg = result.err;
        if (
          errMsg.toLowerCase().includes("api key") ||
          errMsg.toLowerCase().includes("not set")
        ) {
          toast.error("Please set your Anthropic API key in Settings.", {
            duration: 6000,
          });
        } else {
          toast.error(`Error: ${errMsg}`);
        }
        setMessages(messages);
      }
    } catch (_err) {
      toast.error("Failed to send message. Please try again.");
      setMessages(messages);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid bg-scanlines opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex-none border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-magenta">
              <span className="text-base">🤖</span>
            </div>
            <span className="font-mono font-semibold text-foreground text-sm tracking-tight glow-cyan-text glitch-text">
              Claude Cowork Bot
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/50 text-primary hidden sm:flex shadow-glow-sm"
            >
              ICP
            </Badge>
            {activeThread && (
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                / {activeThread.name}
              </span>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Export button */}
            {isLoggedIn && hasMessages && activeThread && (
              <button
                type="button"
                data-ocid="chat.export_button"
                onClick={() => exportThread(activeThread, messages)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Export conversation"
                title="Export as Markdown"
              >
                <Download className="h-4 w-4" />
              </button>
            )}

            {isLoggedIn && (
              <SettingsSheet
                activeThreadId={activeThreadId}
                onClearCurrentThread={handleClearCurrentThread}
              />
            )}

            {isInitializing ? (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="font-mono text-xs gap-1.5"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </Button>
            ) : isLoggedIn ? (
              <Button
                data-ocid="auth.button"
                variant="ghost"
                size="sm"
                onClick={clear}
                className="font-mono text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button
                data-ocid="auth.button"
                size="sm"
                onClick={login}
                disabled={isLoggingIn}
                className="font-mono text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                {isLoggingIn ? "Connecting..." : "Login"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Body: sidebar + chat */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Thread sidebar (only when logged in) */}
        {isLoggedIn && (
          <ThreadSidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onCreateThread={() => setNewThreadDialogOpen(true)}
            onRenameThread={handleRenameThread}
            onDeleteThread={handleDeleteThread}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          />
        )}

        {/* Chat main area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll py-4">
            {hasMessages ? (
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only
                    <MessageBubble key={idx} message={msg} index={idx} />
                  ))}
                </AnimatePresence>
                <AnimatePresence>
                  {isSending && <TypingIndicator />}
                </AnimatePresence>
              </div>
            ) : isSending ? (
              <div className="space-y-1">
                <AnimatePresence>
                  {isSending && <TypingIndicator />}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-none border-t border-border bg-background/90 backdrop-blur-sm">
            {isLoggedIn ? (
              <div className="px-4 py-3">
                <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
                  <Textarea
                    ref={textareaRef}
                    data-ocid="chat.input"
                    value={inputValue}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Claude anything... (Enter to send, Shift+Enter for newline)"
                    rows={1}
                    className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60 min-h-[36px] max-h-[140px] py-1.5 font-body"
                    style={{ height: "36px" }}
                  />
                  <Button
                    data-ocid="chat.submit_button"
                    onClick={handleSend}
                    disabled={
                      !inputValue.trim() || isSending || !activeThreadId
                    }
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-sm disabled:opacity-40 rounded-lg transition-all"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5 font-mono">
                  Conversation stored on-chain · Internet Computer
                </p>
              </div>
            ) : (
              <LoginPrompt onLogin={login} />
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex-none border-t border-border bg-background/80 py-2.5 px-4">
        <p className="text-center text-[10px] text-muted-foreground/50 font-mono">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </footer>

      <NewThreadDialog
        open={newThreadDialogOpen}
        onOpenChange={setNewThreadDialogOpen}
        onCreate={handleCreateThread}
      />

      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "font-body bg-card border-border text-foreground",
            description: "text-muted-foreground",
          },
        }}
      />
    </div>
  );
}
