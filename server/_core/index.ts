import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./localAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();

  // CORS: allow peteryuill.art to fetch public stats
  app.use((req: any, res: any, next: any) => {
    const allowed = ["https://peter-yuill.com", "https://www.peter-yuill.com"];
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/crucible-stats", async (req, res) => {
    try {
      const db = await getDb();
      const [[r1]]: any = await db.execute("SELECT COUNT(*) as t FROM works_core");
      const [[r2]]: any = await db.execute("SELECT tCode FROM works_core ORDER BY id DESC LIMIT 1");
      const [[r3]]: any = await db.execute("SELECT COUNT(*) as t FROM works_core WHERE rating = 5");
      const [[r4]]: any = await db.execute("SELECT COUNT(*) as t FROM works_core WHERE disposition IN (?)", ["Trash"]);
      const [[r5]]: any = await db.execute("SELECT SUM((heightCm * widthCm) / 10000) as m2 FROM works_core WHERE heightCm IS NOT NULL");
      const [[r6]]: any = await db.execute("SELECT SUM(studioHours) as h FROM weekly_roundups WHERE userId = 1");
      const [[r7]]: any = await db.execute("SELECT weekNumber FROM weekly_roundups WHERE userId = 1 ORDER BY weekNumber DESC LIMIT 1");
      const total = Number(r1?.t ?? 0);
      res.json({ currentTCode: r2?.tCode ?? "T_001", totalWorks: total, ratingFiveWorks: Number(r3?.t ?? 0), killRate: total > 0 ? Math.round((Number(r4?.t ?? 0) / total) * 100) : 0, surfaceArea: r5?.m2 ? parseFloat(r5.m2).toFixed(2) : "0", studioHours: r6?.h ? Math.round(r6.h) : 0, weekNumber: r7?.weekNumber ?? 0 });
    } catch(e) { res.status(500).json({ error: "unavailable" }); }
  });

  // Local password-based auth routes
  registerLocalAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
