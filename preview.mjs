import { startServer } from "./serve.mjs";

const port = Number(process.argv[2] || 8001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Port must be an integer between 1 and 65535.");
}

await startServer(port);

