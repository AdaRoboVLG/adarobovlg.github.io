import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const paper = fileURLToPath(new URL("../main.pdf", import.meta.url));
const overviewVideo = "D:\\BaiduSyncdisk\\Documents\\HUST\\0-Paper\\OminiDexVLG\\ppt_video\\PPT\\TRO26-AdaRoboVLG-1080.mp4";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

export function startServer(port = 4173) {
  const server = createServer(async (request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = urlPath === "/" ? "index.html" : urlPath.slice(1);
    const target =
      relative === "main.pdf"
        ? paper
        : relative === "overview-video.mp4"
          ? overviewVideo
          : normalize(join(root, relative));

    if (!target.startsWith(root) && target !== paper && target !== overviewVideo) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error("Not a file");
      const contentType = mime[extname(target)] || "application/octet-stream";
      const range = request.headers.range;

      if (range && contentType === "video/mp4") {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) {
          response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
          return;
        }
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
        if (start > end || start >= info.size) {
          response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
          return;
        }
        response.writeHead(206, {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Content-Length": end - start + 1,
          "Content-Type": contentType,
        });
        createReadStream(target, { start, end }).pipe(response);
        return;
      }

      response.writeHead(200, {
        "Accept-Ranges": contentType === "video/mp4" ? "bytes" : "none",
        "Content-Length": info.size,
        "Content-Type": contentType,
      });
      if (request.method === "HEAD") {
        response.end();
      } else {
        createReadStream(target).pipe(response);
      }
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      console.log(`AdaRoboVLG website preview: http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

if (typeof process !== "undefined" && process.argv[1] === fileURLToPath(import.meta.url)) {
  await startServer();
}
