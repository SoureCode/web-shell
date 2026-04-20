export interface AttachedTerminal {
  readonly sessionId: string;
  fit(): void;
  dispose(): void;
}

export type StatusListener = (status: string) => void;
