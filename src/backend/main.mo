import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Outcall "./http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAdminInternal(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Claude Cowork Bot functionality
  type Message = {
    role : Text;
    content : Text;
  };

  var apiKey : Text = "";
  let conversationHistory : Map.Map<Principal, [Message]> = Map.empty();

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // Hardcoded admin check - always returns true for the four specified principals
  func isAdminInternal(caller : Principal) : Bool {
    let callerText = caller.toText();
    callerText == "qhzth-islcf-hba7y-q4gl3-n6vsh-cvp54-khis5-3qcsi-dv6hz-44mcd-xae" or
    callerText == "wnhau-de23g-57rge-d7lv6-fnzxf-hvkpf-ua53k-mfzgw-flp7b-2voe2-lqe" or
    callerText == "qqo3r-gvrky-iiz2l-23uu5-im2b4-omnu7-ch65g-sqjho-vak5f-cd42y-iae" or
    callerText == "f7ttf-mk7fq-uljq2-feawb-uaaps-6ddxo-hvyby-jttw2-5oi6f-pftnc-iqe";
  };

  public shared ({ caller }) func setApiKey(key : Text) : async { #ok; #err : Text } {
    // Hardcoded admin check takes precedence
    if (not isAdminInternal(caller)) {
      return #err("Unauthorized: Only admins can set the API key");
    };
    apiKey := key;
    #ok;
  };

  public query ({ caller }) func getApiKeyStatus() : async Text {
    // Hardcoded admin check takes precedence
    if (not isAdminInternal(caller)) {
      return "unauthorized";
    };
    if (apiKey == "") { "not_set" } else { "set" };
  };

  public shared ({ caller }) func sendMessage(userMessage : Text) : async { #ok : Text; #err : Text } {
    // Require at least user-level permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only authenticated users can send messages");
    };
    
    if (apiKey == "") {
      return #err("API key not configured. Please set your Anthropic API key in Settings.");
    };
    let existing = switch (conversationHistory.get(caller)) {
      case (?h) { h };
      case (null) { [] };
    };
    let userMsg : Message = { role = "user"; content = userMessage };
    let withUser = existing.concat([userMsg]);
    let messagesJson = buildMessagesJson(withUser);
    let sysPrompt = "You are a helpful cowork assistant. Help the user with their tasks, answer questions, and provide thoughtful guidance.";
    let body = "{\"model\":\"claude-3-5-haiku-20241022\",\"max_tokens\":1024,\"system\":\"" # sysPrompt # "\",\"messages\":" # messagesJson # "}";
    let headers : [Outcall.Header] = [
      { name = "x-api-key"; value = apiKey },
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
    // Require at least user-level permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view history");
    };
    switch (conversationHistory.get(caller)) {
      case (?h) { h };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func clearHistory() : async () {
    // Require at least user-level permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can clear history");
    };
    conversationHistory.remove(caller);
  };

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
