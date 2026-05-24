import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

type EventoRealtime = {
  tipo: string;
  titulo: string;
  mensagem: string;
  severidade?: "baixa" | "media" | "alta";
  unidade?: string;
  payload?: unknown;
};

let wss: WebSocketServer | null = null;

export function iniciarRealtime(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({
      tipo: "conectado",
      titulo: "Tempo real ativo",
      mensagem: "Canal de notificações JetGuard conectado.",
      severidade: "baixa",
      createdAt: new Date().toISOString(),
    }));
  });
}

export function emitirRealtime(evento: EventoRealtime) {
  if (!wss) return;
  const mensagem = JSON.stringify({ ...evento, createdAt: new Date().toISOString() });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(mensagem);
    }
  });
}
