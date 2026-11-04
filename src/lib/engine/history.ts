/** Undo and redo over serialised snapshots. Identical snapshots are ignored, so a click with no change adds no step. */
export class History {
  private past: string[] = [];
  private future: string[] = [];

  constructor(private current: string, private readonly limit = 80) {}

  commit(snapshot: string): boolean {
    if (snapshot === this.current) return false;
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = snapshot;
    this.future = [];
    return true;
  }

  undo(): string | null {
    const previous = this.past.pop();
    if (previous === undefined) return null;
    this.future.push(this.current);
    this.current = previous;
    return previous;
  }

  redo(): string | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(this.current);
    this.current = next;
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
