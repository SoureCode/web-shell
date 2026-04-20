export class Scrollback {
  private buffer = "";

  constructor(private readonly maxBytes: number) {}

  append(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > this.maxBytes) {
      this.buffer = this.buffer.slice(this.buffer.length - this.maxBytes);
    }
  }

  snapshot(): string {
    return this.buffer;
  }
}
