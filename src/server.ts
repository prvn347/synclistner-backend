import express from "express";
import dotenv from "dotenv";
import { initialiseRoutes } from "./routes";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";

const app = express();

dotenv.config();

const port = 3001;
// interface Room {
//   [key: string]: WebSocket[]; // Explicitly allow undefined for uninitialized rooms
// }

async function startServer() {
  app.use(express.json());

  app.use(express.urlencoded({ extended: false }));

  app.use(
    cors({
      credentials: true,
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookies"],

      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  app.options(
    "*",
    cors({
      credentials: true,
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookies"],

      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  initialiseRoutes(app);

  const server = app.listen(port, () => {
    console.log(`Server started at port ${port}`);
  });
  const wss = new WebSocketServer({ server: server });
  let counter = 0;
  const maxClients = 4;

  const users: {
    [key: string]: {
      room: string;
      ws: any;
    };
  } = {};

  // console.log("loadded ropom" + JSON.stringify(rooms));

  wss.on(
    "connection",
    function connection(ws: WebSocket, request: any, client: any) {
      ws.on("error", console.error);
      const wsId = counter++;
      ws.on("message", function message(message: string) {
        try {
          console.log(`Received message ${message} from user ${wsId}`);
          const data = JSON.parse(message);
          const type: string = data.type;
          const params = data.params;
          switch (type) {
            case "join":
              joinRoom(ws, params, wsId);
              break;
            case "leave":
              leaveRoom(wsId, ws);
              break;
            case "play":
            case "pause":
            case "seek":
            case "videoId":
              broadcastToRoom(ws, data, wsId);
              break;
            default:
              console.warn(`Unknown message type: ${type}`);
          }
        } catch (error) {
          console.error(error);
        }
      });

      ws.on("close", () => {
        leaveRoom(wsId, ws);
      });
    }
  );

  function joinRoom(
    ws: WebSocket,
    params: { code: string; name: string },
    wsId: number
  ) {
    console.log(
      "someone joining " +
        wsId +
        "  server " +
        "and he/she is in room key " +
        params.code
    );
    try {
      // if (!users[wsId].room) {
      //   console.warn(`Room ${params.code} does not exist`);
      //   return;
      // }
      //Todo add max client logic hered
      // if (users[wsId].room.length >= maxClients) {
      //   console.warn(`Room ${params.code} is full`);
      //   return;
      // }
      const message = { type: "joined", name: params.name };
      users[wsId] = {
        room: params.code,
        ws,
      };
      broadcastToRoom(ws, message, wsId);
      //todo send message that someones join maybe sent name lol add it in db or persist maybe
    } catch (error) {
      console.error(error);
    }
  }
  function leaveRoom(wsId: number, ws: WebSocket) {
    ws.on("close", () => {
      console.log("User " + wsId + " disconnected");
      // Remove user from the users object based on wsId
      delete users[wsId];
    });
  }
  function broadcastToRoom(sender: WebSocket, message: any, wsId: number) {
    try {
      const roomId = users[wsId].room;
      console.log(`Broadcasting to room: ${roomId}`);

      console.log(
        "users in some server" +
          " are sendting messgae to each other in " +
          users[wsId].room +
          "but the actual room is " +
          roomId
      );
      if (!users || !users[wsId]) return;
      Object.keys(users).forEach((wsId) => {
        if (users[wsId].room === roomId) {
          users[wsId].ws.send(JSON.stringify(message));
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  function sendMessage(ws: WebSocket, message: any) {
    ws.send(JSON.stringify(message));
  }
}

startServer();
