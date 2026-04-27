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
import { sql } from "drizzle-orm";

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
      if (!db) { res.status(500).json({ error: "no db" }); return; }
      const [rows1] = await db.execute(sql`SELECT COUNT(*) as t FROM works_core WHERE userId = 1`);
      const [rows2] = await db.execute(sql`SELECT code FROM works_core WHERE userId = 1 ORDER BY id DESC LIMIT 1`);
      const [rows3] = await db.execute(sql`SELECT COUNT(*) as t FROM works_core WHERE userId = 1 AND rating = 5`);
      const [rows4] = await db.execute(sql`SELECT COUNT(*) as t FROM works_core WHERE userId = 1 AND disposition IN ('Trash', 'Probably_Trash')`);
      const [rows5] = await db.execute(sql`SELECT SUM((heightCm * widthCm) / 10000) as m2 FROM works_core WHERE userId = 1 AND heightCm IS NOT NULL AND widthCm IS NOT NULL`);
      const [rows6] = await db.execute(sql`SELECT SUM(studioHours) as h FROM weekly_roundups WHERE userId = 1`);
      const [rows7] = await db.execute(sql`SELECT weekNumber FROM weekly_roundups WHERE userId = 1 ORDER BY weekNumber DESC LIMIT 1`);
      const a1=rows1 as any[],a2=rows2 as any[],a3=rows3 as any[],a4=rows4 as any[],a5=rows5 as any[],a6=rows6 as any[],a7=rows7 as any[];
      const total = Number(a1[0]?.t ?? 0);
      res.json({
        currentTCode: a2[0]?.code ?? "T_001",
        totalWorks: total,
        ratingFiveWorks: Number(a3[0]?.t ?? 0),
        killRate: total > 0 ? Math.round((Number(a4[0]?.t ?? 0) / total) * 100) : 0,
        surfaceArea: a5[0]?.m2 ? parseFloat(a5[0].m2).toFixed(2) : "0",
        studioHours: a6[0]?.h ? Math.round(a6[0].h) : 0,
        weekNumber: a7[0]?.weekNumber ?? 0,
      });
    } catch(e: any) { res.status(500).json({ error: e?.message ?? String(e) }); }
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
