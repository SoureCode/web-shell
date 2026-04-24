export interface AttachedTerminal {
  readonly sessionId: string;
  fit(): void;
  sendInput(data: string): void;
  retry(): void;
  dispose(): void;
}

export type StatusKind =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "exited"
  | "error";

export interface Status {
  readonly kind: StatusKind;
  readonly text: string;
  readonly attempt?: number;
}

export type StatusListener = (status: Status) => void;
