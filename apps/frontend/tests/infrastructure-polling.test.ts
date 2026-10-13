import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/shared/api/client";
import {
  INFRASTRUCTURE_POLL_MS,
  startPolling,
} from "../src/features/infrastructure/use-infrastructure";

test("polling serializes requests, pauses in background, preserves stale snapshots and cancels on cleanup", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const documentStub = Object.assign(new EventTarget(), { hidden: false });
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentStub,
  });
  const adapter = api.defaults.adapter;
  let requests = 0;
  let fail = false;
  let hold = false;
  let release: (() => void) | undefined;
  let lastSignal: { aborted?: boolean } | undefined;
  api.defaults.adapter = async (config) => {
    requests += 1;
    lastSignal = config.signal;
    if (hold)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    if (fail) throw new Error("Cluster offline");
    return {
      data: [
        {
          id: "node",
          hostname: "node",
          status: "ok",
          metrics: { cpu: 45, ram: 72, disk: 0 },
        },
      ],
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  let snapshots = 0;
  let error: string | null = null;
  const stop = startPolling({
    hosts: () => {
      snapshots += 1;
    },
    updatedAt: () => {},
    error: (value) => {
      error = value;
    },
    loading: () => {},
  });
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  try {
    await flush();
    assert.equal(requests, 1);
    assert.equal(snapshots, 1);
    documentStub.hidden = true;
    documentStub.dispatchEvent(new Event("visibilitychange"));
    t.mock.timers.tick(INFRASTRUCTURE_POLL_MS * 2);
    await flush();
    assert.equal(requests, 1);
    documentStub.hidden = false;
    documentStub.dispatchEvent(new Event("visibilitychange"));
    documentStub.dispatchEvent(new Event("visibilitychange"));
    await flush();
    assert.equal(requests, 2);
    fail = true;
    t.mock.timers.tick(INFRASTRUCTURE_POLL_MS);
    await flush();
    assert.equal(snapshots, 2);
    assert.match(error ?? "", /unavailable/);
    fail = false;
    t.mock.timers.tick(INFRASTRUCTURE_POLL_MS);
    await flush();
    assert.equal(error, null);
    hold = true;
    documentStub.dispatchEvent(new Event("visibilitychange"));
    await flush();
    stop();
    assert.equal(lastSignal?.aborted, true);
    release?.();
    await flush();
    const count = requests;
    t.mock.timers.tick(INFRASTRUCTURE_POLL_MS * 2);
    documentStub.dispatchEvent(new Event("visibilitychange"));
    await flush();
    assert.equal(requests, count);
  } finally {
    stop();
    release?.();
    api.defaults.adapter = adapter;
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
