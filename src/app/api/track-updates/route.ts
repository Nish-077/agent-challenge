import { NextRequest } from "next/server";
import { watch } from "fs";
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

      // Watch the track.json file for changes
      const trackPath = join(process.cwd(), "public", "track.json");
      
      const watcher = watch(trackPath, (eventType) => {
        if (eventType === "change") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "update" })}\n\n`)
          );
        }
      });

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        watcher.close();
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
