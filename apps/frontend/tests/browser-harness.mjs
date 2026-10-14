import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

function connection(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const errors = [];
  let id = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    errors,
    async send(method, params = {}) {
      if (socket.readyState !== WebSocket.OPEN) {
        await new Promise((done, fail) => {
          socket.addEventListener("open", done, { once: true });
          socket.addEventListener("error", fail, { once: true });
        });
      }
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`CDP timeout: ${method}`));
        }, 15_000);
        pending.set(requestId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

export async function browserFixture() {
  const executable = process.env.TEST_BROWSER ?? [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/chromium", "/usr/bin/google-chrome",
  ].find(existsSync);
  if (!executable) throw new Error("Set TEST_BROWSER to an installed Chromium browser.");
  const profile = await mkdtemp(resolve(tmpdir(), "telemetry-ui-test-"));
  const entry = resolve(root, "tests/browser-fixture.tsx").replaceAll("\\", "/");
  const server = await createServer({
    root, configFile: resolve(root, "vite.config.ts"),
    server: { host: "127.0.0.1", port: 0, open: false },
    plugins: [{
      name: "isolated-test-document",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!/^\/(?:org\/|does-not-exist|$)/.test(req.url.split("?")[0])) return next();
          try {
            const html = await vite.transformIndexHtml(req.url,
              `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/@fs/${entry}"></script>`);
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (error) { next(error); }
        });
      },
    }],
  });
  let child, page;
  try {
    await server.listen();
    const port = server.httpServer.address().port;
    child = spawn(executable, [
      "--headless=new", "--disable-gpu", "--no-first-run", "--disable-default-apps",
      "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
    ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let output = "";
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => { output += error.message; });
    const deadline = Date.now() + 15_000;
    while (!output.includes("DevTools listening") && Date.now() < deadline) await delay(50);
    const debug = output.match(/ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1];
    if (!debug) throw new Error(`Browser did not start: ${output.slice(-500)}`);
    const targets = await fetch(`http://127.0.0.1:${debug}/json/list`).then((res) => res.json());
    page = connection(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    const evaluate = async (expression) => {
      const result = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async (expression) => {
      const until = Date.now() + 15_000;
      while (Date.now() < until) {
        if (await evaluate(expression)) return;
        await delay(50);
      }
      throw new Error(`Fixture condition timed out: ${expression}\n${await evaluate("document.body.innerText")}\n${JSON.stringify(page.errors)}`);
    };
    return {
      evaluate, wait,
      async viewport(width, height = 900) {
        await page.send("Emulation.setDeviceMetricsOverride", {
          width, height, deviceScaleFactor: 1, mobile: width < 768,
        });
      },
      async navigate(path) {
        await page.send("Page.navigate", { url: `http://127.0.0.1:${port}${path}` });
        await wait("Boolean(window.__fixtureReady)");
      },
      async key(key, code = key, virtualKey = 13) {
        const text = key === "Enter" ? "\r" : key === " " ? " " : undefined;
        await page.send("Input.dispatchKeyEvent", {
          type: text ? "keyDown" : "rawKeyDown", key, code,
          windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey,
          text, unmodifiedText: text,
        });
        await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKey });
      },
      async close() {
        page.close();
        const exit = new Promise((done) => child.once("exit", done));
        child.kill();
        await Promise.race([exit, delay(3000)]);
        await server.close();
        await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      },
    };
  } catch (error) {
    page?.close(); child?.kill(); await server.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    throw error;
  }
}
