const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "inquiries.jsonl");
const maxBodyBytes = 32 * 1024;
const rateLimitWindow = 15 * 60 * 1000;
const rateLimitMax = 5;
const rateLimits = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const allowedServices = new Set([
  "computer-support",
  "malware-security",
  "small-business-it",
  "wifi-network",
  "backup-data",
  "cybersecurity",
  "managed-it",
  "not-sure",
]);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    ...securityHeaders,
    "Cache-Control": "no-cache",
    ...headers,
  });
  res.end(body);
};

const sendJson = (res, status, payload) => {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
  });
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resultPage = (title, message) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | Elephant Security</title>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/">Return to Elephant Security</a></p>
    </main>
  </body>
</html>`;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });

const parseBody = (req, body) => {
  const type = (req.headers["content-type"] || "").split(";")[0].trim();

  if (type === "application/json") {
    return JSON.parse(body || "{}");
  }

  if (type === "application/x-www-form-urlencoded") {
    return Object.fromEntries(new URLSearchParams(body));
  }

  throw Object.assign(new Error("Unsupported content type."), { status: 415 });
};

const isRateLimited = (clientKey) => {
  const now = Date.now();
  const current = rateLimits.get(clientKey);

  if (!current || now - current.startedAt > rateLimitWindow) {
    rateLimits.set(clientKey, { count: 1, startedAt: now });
    return false;
  }

  if (current.count >= rateLimitMax) {
    return true;
  }

  current.count += 1;
  return false;
};

const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const validateInquiry = (data) => {
  const name = cleanText(data.name, 120);
  const email = cleanText(data.email, 254);
  const organization = cleanText(data.organization, 160);
  const service = cleanText(data.service, 60);
  const message = cleanText(data.message, 5000);
  const consent = data.consent === true || data.consent === "yes" || data.consent === "on";

  if (!name) {
    return { error: "Please provide your name." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please provide a valid email address." };
  }

  if (!allowedServices.has(service)) {
    return { error: "Please select a valid service area." };
  }

  if (message.length < 10) {
    return { error: "Please describe what you need help with." };
  }

  if (!consent) {
    return { error: "Please confirm that your details may be used to respond." };
  }

  return {
    value: {
      name,
      email,
      organization,
      service,
      message,
    },
  };
};

const handleContact = async (req, res) => {
  const wantsJson = (req.headers.accept || "").includes("application/json");
  const respond = (status, message) => {
    if (wantsJson) {
      sendJson(res, status, { ok: status >= 200 && status < 300, message });
      return;
    }

    send(res, status, resultPage(status < 300 ? "Request received" : "Request not sent", message), {
      "Content-Type": "text/html; charset=utf-8",
    });
  };

  if (req.method !== "POST") {
    send(res, 405, "Method not allowed.", { Allow: "POST" });
    return;
  }

  const clientKey = req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientKey)) {
    respond(429, "Too many requests. Please wait a little while and try again.");
    return;
  }

  try {
    const body = await readBody(req);
    const data = parseBody(req, body);

    if (data.website) {
      respond(200, "Request received. I will review the details and follow up using the email provided.");
      return;
    }

    const validation = validateInquiry(data);
    if (validation.error) {
      respond(400, validation.error);
      return;
    }

    const inquiry = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      ...validation.value,
    };

    await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
    await fs.appendFile(dataFile, `${JSON.stringify(inquiry)}\n`, { mode: 0o600 });

    respond(200, "Request received. I will review the details and follow up using the email provided.");
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) {
      console.error("Contact form error:", error.message);
    }
    respond(status, status >= 500 ? "The request could not be saved. Please try again later." : error.message);
  }
};

const serveStatic = async (req, res, pathname) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed.", { Allow: "GET, HEAD" });
    return;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname).replace(/^\/+/, "");
  } catch {
    send(res, 400, "Bad request.", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const blocked = [".git", "data", "node_modules", "server.js"].some(
    (segment) => relativePath === segment || relativePath.startsWith(`${segment}/`)
  );

  if (blocked) {
    send(res, 404, "Not found.", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    send(res, 403, "Forbidden.", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    send(res, 200, req.method === "HEAD" ? undefined : file, {
      "Content-Type": contentType,
      "Content-Length": file.length,
    });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      send(res, 404, "Not found.", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    console.error("Static file error:", error.message);
    send(res, 500, "Server error.", { "Content-Type": "text/plain; charset=utf-8" });
  }
};

const server = http.createServer(async (req, res) => {
  let pathname;

  try {
    pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  } catch {
    send(res, 400, "Bad request.", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (pathname === "/api/contact") {
    await handleContact(req, res);
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(port, () => {
  console.log(`Elephant Security running at http://localhost:${port}`);
});
