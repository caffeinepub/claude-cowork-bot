import type { ActorMethod } from "@dfinity/agent";
import type { Principal } from "@dfinity/principal";
import type { Identity } from "@icp-sdk/core/agent";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";

export interface Message {
  content: string;
  role: string;
}
export interface TransformationInput {
  context: Uint8Array | number[];
  response: http_request_result;
}
export interface TransformationOutput {
  status: bigint;
  body: Uint8Array | number[];
  headers: Array<http_header>;
}
export type UserRole = { admin: null } | { user: null } | { guest: null };
export interface http_header {
  value: string;
  name: string;
}
export interface http_request_result {
  status: bigint;
  body: Uint8Array | number[];
  headers: Array<http_header>;
}
export interface _SERVICE {
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], undefined>;
  clearHistory: ActorMethod<[], undefined>;
  getApiKeyStatus: ActorMethod<[], string>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  getHistory: ActorMethod<[], Array<Message>>;
  isCallerAdmin: ActorMethod<[], boolean>;
  sendMessage: ActorMethod<[string], { ok: string } | { err: string }>;
  setApiKey: ActorMethod<[string], { ok: null } | { err: string }>;
  transform: ActorMethod<[TransformationInput], TransformationOutput>;
}

export type backendInterface = _SERVICE;

export class ExternalBlob {
  private _url: string;
  private _progress?: (p: number) => void;

  private constructor(url: string) {
    this._url = url;
  }

  static fromURL(url: string): ExternalBlob {
    return new ExternalBlob(url);
  }

  get onProgress(): ((p: number) => void) | undefined {
    return this._progress;
  }

  async getBytes(): Promise<Uint8Array> {
    const response = await fetch(this._url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
}

export interface CreateActorOptions {
  agentOptions?: {
    identity?: Identity | Promise<Identity>;
    host?: string;
  };
}

function buildIdlFactory(IDL: {
  Variant: (fields: Record<string, unknown>) => unknown;
  Record: (fields: Record<string, unknown>) => unknown;
  Vec: (t: unknown) => unknown;
  Func: (args: unknown[], ret: unknown[], ann: string[]) => unknown;
  Service: (methods: Record<string, unknown>) => unknown;
  Text: unknown;
  Nat: unknown;
  Nat8: unknown;
  Bool: unknown;
  Null: unknown;
  Principal: unknown;
}) {
  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });
  const Message = IDL.Record({ content: IDL.Text, role: IDL.Text });
  const http_header = IDL.Record({ value: IDL.Text, name: IDL.Text });
  const http_request_result = IDL.Record({
    status: IDL.Nat,
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(http_header),
  });
  const TransformationInput = IDL.Record({
    context: IDL.Vec(IDL.Nat8),
    response: http_request_result,
  });
  const TransformationOutput = IDL.Record({
    status: IDL.Nat,
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(http_header),
  });
  return IDL.Service({
    _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
    assignCallerUserRole: IDL.Func([IDL.Principal, UserRole], [], []),
    clearHistory: IDL.Func([], [], []),
    getApiKeyStatus: IDL.Func([], [IDL.Text], ["query"]),
    getCallerUserRole: IDL.Func([], [UserRole], ["query"]),
    getHistory: IDL.Func([], [IDL.Vec(Message)], ["query"]),
    isCallerAdmin: IDL.Func([], [IDL.Bool], ["query"]),
    sendMessage: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ ok: IDL.Text, err: IDL.Text })],
      [],
    ),
    setApiKey: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ ok: IDL.Null, err: IDL.Text })],
      [],
    ),
    transform: IDL.Func(
      [TransformationInput],
      [TransformationOutput],
      ["query"],
    ),
  });
}

export function idlFactory(options: {
  IDL: Parameters<typeof buildIdlFactory>[0];
}) {
  return buildIdlFactory(options.IDL);
}

export function init(_options: { IDL: unknown }) {
  return [];
}

export async function createActor(
  canisterId: string,
  _uploadFile?: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile?: (bytes: Uint8Array) => Promise<ExternalBlob>,
  options?: CreateActorOptions,
): Promise<backendInterface> {
  const agent = new HttpAgent({
    ...(options?.agentOptions ?? {}),
  });
  return Actor.createActor<backendInterface>(
    idlFactory as Parameters<typeof Actor.createActor>[0],
    {
      agent,
      canisterId,
    },
  );
}
