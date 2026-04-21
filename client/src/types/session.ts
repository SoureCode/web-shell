export interface SessionInfo {
  readonly id: string;
  readonly title: string;
  readonly shell: string;
  readonly cols: number;
  readonly rows: number;
  readonly createdAt: number;
  readonly order: number;
}

export interface CreateSessionInput {
  readonly title?: string;
  readonly shell?: string;
  readonly cols?: number;
  readonly rows?: number;
}
