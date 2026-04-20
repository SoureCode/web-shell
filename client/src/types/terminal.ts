export interface AttachedTerminal {
  readonly sessionId: string;
  fit(): void;
  sendInput(data: string): void;
  dispose(): void;
}

export type StatusListener = (status: string) => void;
