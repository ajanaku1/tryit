import type { NextRequest } from "next/server";
import { getTry } from "@/lib/db/store";
import { subscribe, type BootEvent } from "@/lib/boot/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function format(event: BootEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await getTry(id);
  if (!row) {
    return new Response(`try ${id} not found`, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };
      const send = (e: BootEvent) => safeEnqueue(encoder.encode(format(e)));

      const { history, unsubscribe } = subscribe(id, (e) => {
        send(e);
        if (e.type === "end") finish();
      });

      for (const e of history) send(e);

      safeEnqueue(encoder.encode(`: heartbeat\n\n`));
      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15_000);

      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      if (history.some((e) => e.type === "end")) {
        setTimeout(finish, 100);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
