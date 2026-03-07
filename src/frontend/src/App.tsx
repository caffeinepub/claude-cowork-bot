import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Bot,
  Bug,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
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
  useClearHistory,
  useGetApiKeyStatus,
  useGetHistory,
  useIsAdmin,
  useSendMessage,
  useSetApiKey,
} from "./hooks/useQueries";

// ---- Settings Sheet ----
function SettingsSheet() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const { data: keyStatus, isLoading: statusLoading } = useGetApiKeyStatus();
  const setApiKeyMutation = useSetApiKey();
  const clearHistoryMutation = useClearHistory();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { identity } = useInternetIdentity();

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    const result = await setApiKeyMutation.mutateAsync(apiKey.trim());
    if ("ok" in result) {
      toast.success("API key saved successfully");
      setApiKey("");
    } else if (
      result.err.toLowerCase().includes("backend admin registration")
    ) {
      toast.error(result.err, {
        duration: 10000,
        description:
          "Your principal is recognised as admin on the frontend, but the canister needs to be redeployed to register it on the backend.",
      });
    } else {
      toast.error(`Failed to save API key: ${result.err}`);
    }
  };

  const handleClearHistory = async () => {
    await clearHistoryMutation.mutateAsync();
    toast.success("Conversation history cleared");
    setClearConfirmOpen(false);
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
          className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        data-ocid="settings.sheet"
        className="w-[340px] sm:w-[400px] bg-card border-border"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="font-mono text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8">
          {/* API Key Section */}
          {isAdmin && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Anthropic API Key
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your key is stored securely in the canister and only used for
                  API calls.
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
          )}

          {isAdmin && <Separator className="bg-border" />}

          {/* Conversation Section */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Conversation
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your conversation history stored on-chain.
              </p>
            </div>

            <AlertDialog
              open={clearConfirmOpen}
              onOpenChange={setClearConfirmOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  data-ocid="chat.clear_button"
                  variant="destructive"
                  className="w-full font-mono text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Conversation History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                data-ocid="chat.dialog"
                className="bg-card border-border"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-mono text-foreground">
                    Clear all messages?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete your entire conversation
                    history from the canister. This action cannot be undone.
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
              {/* Login status */}
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
              {/* Admin status */}
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
              {/* API key status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  API key status
                </span>
                <span className="text-xs font-mono text-foreground/70 max-w-[160px] truncate text-right">
                  {statusLoading ? "loading..." : (keyStatus ?? "undefined")}
                </span>
              </div>
              {/* Principal */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  Principal
                </span>
                <span className="text-xs font-mono text-foreground/70 break-all text-right max-w-[220px]">
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
}: {
  message: Message;
  index: number;
}) {
  const isUser = message.role === "user";
  const ocid = `chat.item.${index + 1}`;

  return (
    <motion.div
      data-ocid={ocid}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-start gap-3 px-4 py-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
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

      {/* Bubble */}
      <div
        className={`max-w-[75%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}
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
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/80 animate-pulse" />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-foreground/80 text-base font-medium">
          Start a conversation below
        </p>
        <p className="text-muted-foreground text-sm max-w-xs">
          Ask Claude anything — it runs on the Internet Computer, with your
          conversation history stored on-chain.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {["Explain ICP canisters", "Help debug code", "Write an email"].map(
          (suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="text-xs border-border text-muted-foreground font-mono cursor-default hover:border-primary/40 transition-colors"
            >
              {suggestion}
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
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground font-mono">
          Login to start chatting
        </p>
      </div>
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

// ---- Main App ----
export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: history = [], isLoading: historyLoading } = useGetHistory();
  const sendMessageMutation = useSendMessage();

  const [inputValue, setInputValue] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync backend history to local messages
  useEffect(() => {
    if (!historyLoading) {
      setLocalMessages(history);
    }
  }, [history, historyLoading]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever messages or sending state changes
  useEffect(() => {
    scrollToBottom();
  }, [localMessages, isSending, scrollToBottom]);

  // Auto-grow textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setLocalMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const result = await sendMessageMutation.mutateAsync(trimmed);
      if ("ok" in result) {
        const assistantMessage: Message = {
          role: "assistant",
          content: result.ok,
        };
        setLocalMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errMsg = result.err;
        // Show helpful message if API key is missing
        if (
          errMsg.toLowerCase().includes("api key") ||
          errMsg.toLowerCase().includes("not set")
        ) {
          toast.error(
            "Anthropic API key not configured. Ask an admin to set it in Settings.",
            {
              duration: 6000,
            },
          );
        } else {
          toast.error(`Error: ${errMsg}`);
        }
        // Remove the optimistic user message on error
        setLocalMessages((prev) => prev.slice(0, -1));
      }
    } catch (_err) {
      toast.error("Failed to send message. Please try again.");
      setLocalMessages((prev) => prev.slice(0, -1));
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

  const hasMessages = localMessages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex-none border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-4xl mx-auto">
          {/* Logo / Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-base">🤖</span>
            </div>
            <span className="font-mono font-semibold text-foreground text-sm tracking-tight">
              Claude Cowork Bot
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/30 text-primary/70 hidden sm:flex"
            >
              ICP
            </Badge>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Settings — only when logged in */}
            {isLoggedIn && <SettingsSheet />}

            {/* Auth button */}
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

      {/* Chat Area */}
      <main className="relative flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto chat-scroll py-4"
        >
          {historyLoading ? (
            /* Skeleton loading */
            <div data-ocid="chat.loading_state" className="space-y-4 px-4 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                >
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 bg-muted" />
                  <Skeleton
                    className="h-12 bg-muted rounded-2xl"
                    style={{ width: `${40 + i * 15}%` }}
                  />
                </div>
              ))}
            </div>
          ) : hasMessages ? (
            /* Message list */
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {localMessages.map((msg, idx) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: messages are append-only and have no stable IDs
                  <MessageBubble key={idx} message={msg} index={idx} />
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {isSending && <TypingIndicator />}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-none border-t border-border bg-background/90 backdrop-blur-sm">
          {isLoggedIn ? (
            <div className="px-4 py-3 max-w-4xl mx-auto">
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
                  disabled={!inputValue.trim() || isSending}
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 rounded-lg transition-all"
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
