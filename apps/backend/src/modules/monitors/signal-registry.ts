import type { SignalAdapter, SignalType } from './signal-adapter';

export class SignalRegistry {
  constructor(private readonly adapters: ReadonlyMap<SignalType, SignalAdapter>) {}

  get(signal: SignalType): SignalAdapter {
    const adapter = this.adapters.get(signal);
    if (!adapter) throw new Error(`No adapter registered for signal ${signal}.`);
    return adapter;
  }
}
