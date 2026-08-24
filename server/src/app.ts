import fs from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { ValidationError } from "./validation.js";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use("/api", apiRouter);

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown API endpoint" } });
  });

  // In production the built client is copied next to the server (see Dockerfile).
  // In development Vite serves it and proxies /api here, so this block is skipped.
  const indexHtml = path.join(config.publicDir, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.publicDir, { index: false, maxAge: "1h" }));
    // SPA fallback. Express 5 dropped bare `'*'` string routes, hence the terminal middleware.
    app.use((_req: Request, res: Response) => {
      res.sendFile(indexHtml);
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ValidationError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    console.error("Unhandled error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong while processing the request" },
    });
  });

  return app;
}
