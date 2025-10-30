import { NextRequest } from "next/server";
import { statSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Poll track.json for changes every 100ms (more reliable than fs.watch)
      const trackPath = join(process.cwd(), "public", "track.json");
      let lastModified = 0;
      
      try {
        lastModified = statSync(trackPath).mtimeMs;
      } catch (e) {
        console.error("Error reading track.json initial state:", e);
      }
      
      const pollInterval = setInterval(() => {
        try {
          const currentModified = statSync(trackPath).mtimeMs;
          
          if (currentModified !== lastModified) {
            lastModified = currentModified;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "update" })}\n\n`)
            );
          }
        } catch (e) {
          // File might be temporarily locked during write, skip this poll
        }
      }, 100); // Poll every 100ms

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
