export interface InputMessage {
  readonly type: "input";
  readonly data: string;
}

export interface ResizeMessage {
  readonly type: "resize";
  readonly cols: number;
  readonly rows: number;
}

export type ClientMessage = InputMessage | ResizeMessage;

export interface HistoryMessage {
  readonly type: "history";
  readonly data: string;
}

export interface OutputMessage {
  readonly type: "output";
  readonly data: string;
}

export interface ExitMessage {
  readonly type: "exit";
  readonly code: number;
  readonly signal?: number;
}

export type ServerMessage = HistoryMessage | OutputMessage | ExitMessage;
