import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Outcall "./http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAdminInternal(caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // ---- Types ----
  type Message = {
    role : Text;
    content : Text;
  };

  // ---- State ----
  var apiKey : Text = ""; // shared admin key (fallback)
  var customSystemPrompt : Text = "";
  var persistentMemory : Text = "";

  let conversationHistory : Map.Map<Principal, [Message]> = Map.empty();
  let userApiKeys : Map.Map<Principal, Text> = Map.empty(); // per-user keys

  // ---- Helpers ----
  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  func isAdminInternal(caller : Principal) : Bool {
    let t = caller.toText();
    t == "qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae" or
    t == "wnhau-de23g-57rge-d7lv6-fnzxf-hvkpf-ua53k-mfzgw-flp7b-2voe2-lqe" or
    t == "qqo3r-gvrky-iiz2l-23uu5-im2b4-omnu7-ch65g-sqjho-vak5f-cd42y-iae" or
    t == "f7ttf-mk7fq-uljq2-feawb-uaaps-6ddxo-hvyby-jttw2-5oi6f-pftnc-iqe";
  };

  func buildSystemPrompt() : Text {
    let base = if (customSystemPrompt == "") {
      "You are a helpful cowork assistant. Help the user with their tasks, answer questions, and provide thoughtful guidance."
    } else {
      customSystemPrompt
    };
    if (persistentMemory == "") {
      base
    } else {
      "User context: " # persistentMemory # "\n\n" # base
    };
  };

  // ---- Shared Admin API Key (admin only) ----
  public shared ({ caller }) func setApiKey(key : Text) : async { #ok; #err : Text } {
    if (not isAdminInternal(caller)) {
      return #err("Unauthorized: Only admins can set the shared API key");
    };
    apiKey := key;
    #ok;
  };

  public query ({ caller }) func getApiKeyStatus() : async Text {
    if (not isAdminInternal(caller)) { return "unauthorized" };
    if (apiKey == "") { "not_set" } else { "set" };
  };

  // ---- Per-User API Key ----
  public shared ({ caller }) func setMyApiKey(key : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Please log in to set your API key");
    };
    userApiKeys.add(caller, key);
    #ok;
  };

  public query ({ caller }) func getMyApiKeyStatus() : async Text {
    if (caller.isAnonymous()) {
      return "unauthorized";
    };
    switch (userApiKeys.get(caller)) {
      case (?k) { if (k == "") { "not_set" } else { "set" } };
      case (null) { "not_set" };
    };
  };

  // ---- System Prompt ----
  public shared ({ caller }) func setSystemPrompt(prompt : Text) : async { #ok; #err : Text } {
    if (not isAdminInternal(caller)) {
      return #err("Unauthorized");
    };
    customSystemPrompt := prompt;
    #ok;
  };

  public query ({ caller }) func getSystemPrompt() : async Text {
    if (not isAdminInternal(caller)) { return "" };
    customSystemPrompt;
  };

  // ---- Persistent Memory ----
  public shared ({ caller }) func setMemory(text : Text) : async { #ok; #err : Text } {
    if (not isAdminInternal(caller)) {
      return #err("Unauthorized");
    };
    persistentMemory := text;
    #ok;
  };

  public query ({ caller }) func getMemory() : async Text {
    if (not isAdminInternal(caller)) { return "" };
    persistentMemory;
  };

  // ---- Messaging ----
  public shared ({ caller }) func sendMessage(userMessage : Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: Please log in to send messages");
    };
    // Resolve API key: user's own key takes priority, fallback to shared admin key
    let resolvedKey = switch (userApiKeys.get(caller)) {
      case (?k) { if (k != "") { k } else { apiKey } };
      case (null) { apiKey };
    };
    if (resolvedKey == "") {
      return #err("API key not configured. Please set your Anthropic API key in Settings.");
    };
    let existing = switch (conversationHistory.get(caller)) {
      case (?h) { h };
      case (null) { [] };
    };
    let userMsg : Message = { role = "user"; content = userMessage };
    let withUser = existing.concat([userMsg]);
    let messagesJson = buildMessagesJson(withUser);
    let sysPrompt = buildSystemPrompt();
    let body = "{\"model\":\"claude-3-5-haiku-20241022\",\"max_tokens\":1024,\"system\":\"" # escapeJson(sysPrompt) # "\",\"messages\":" # messagesJson # "}";
    let headers : [Outcall.Header] = [
      { name = "x-api-key"; value = resolvedKey },
      { name = "anthropic-version"; value = "2023-06-01" },
      { name = "content-type"; value = "application/json" },
    ];
    let responseText = try {
      await Outcall.httpPostRequest(
        "https://api.anthropic.com/v1/messages",
        headers,
        body,
        transform,
      );
    } catch (e) {
      return #err("HTTP outcall failed: " # e.message());
    };
    switch (parseAssistantReply(responseText)) {
      case (null) {
        return #err("Failed to parse Claude response: " # responseText);
      };
      case (?reply) {
        let assistantMsg : Message = { role = "assistant"; content = reply };
        conversationHistory.add(caller, withUser.concat([assistantMsg]));
        #ok(reply);
      };
    };
  };

  public query ({ caller }) func getHistory() : async [Message] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized");
    };
    switch (conversationHistory.get(caller)) {
      case (?h) { h };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func clearHistory() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized");
    };
    conversationHistory.remove(caller);
  };

  // ---- JSON Helpers ----
  func buildMessagesJson(messages : [Message]) : Text {
    let parts = messages.map(func(msg : Message) : Text {
      "{\"role\":\"" # msg.role # "\",\"content\":\"" # escapeJson(msg.content) # "\"}"
    });
    "[" # parts.vals().join(",") # "]";
  };

  func escapeJson(s : Text) : Text {
    var result = "";
    for (c in s.chars()) {
      if (c == '\"') { result #= "\\\"" }
      else if (c == '\\') { result #= "\\\\" }
      else if (c == '\n') { result #= "\\n" }
      else if (c == '\r') { result #= "\\r" }
      else if (c == '\t') { result #= "\\t" }
      else { result #= Text.fromChar(c) };
    };
    result;
  };

  func parseAssistantReply(json : Text) : ?Text {
    let textKey = "\"text\":\"";
    let parts = json.split(#text textKey).toArray();
    if (parts.size() < 2) { return null };
    let rest = parts[1];
    var reply = "";
    var i = 0;
    let chars = rest.toArray();
    let len = chars.size();
    var found = false;
    label parseLoop while (i < len) {
      let c = chars[i];
      if (c == '\\' and i + 1 < len) {
        let next = chars[i + 1];
        if (next == '\"') { reply #= "\""; i += 2 }
        else if (next == '\\') { reply #= "\\"; i += 2 }
        else if (next == 'n') { reply #= "\n"; i += 2 }
        else if (next == 'r') { reply #= "\r"; i += 2 }
        else if (next == 't') { reply #= "\t"; i += 2 }
        else { reply #= Text.fromChar(next); i += 2 };
      } else if (c == '\"') {
        found := true;
        break parseLoop;
      } else {
        reply #= Text.fromChar(c);
        i += 1;
      };
    };
    if (found) { ?reply } else { null };
  };
};
