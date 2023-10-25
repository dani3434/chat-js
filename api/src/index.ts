import express, { Request } from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import { UserModel } from "../models/User";
import ws from "ws";
import { MessageModel } from "../models/Message";
import fs from "fs";

dotenv.config();

const minhaVariavel: string | undefined = process.env.MONGO_URL;
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

if (minhaVariavel !== undefined) {
  // Agora você pode usar minhaVariavel com segurança como uma string
  mongoose.connect(minhaVariavel);
} else {
  // Trate o caso em que a variável de ambiente é indefinida
  console.log("MINHA_VARIAVEL_DE_AMBIENTE não está definida");
}

const app = express();
app.use("/uploads", express.static(__dirname + "/uploads/"));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

interface UserData {
  userId: string;
}
async function getUserDataFromRequest(req: Request): Promise<UserData> {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;

    if (token) {
      jwt.verify(token, jwtSecret as string, {}, (err, userData) => {
        if (err) {
          // Trate o erro aqui, por exemplo, rejeitando a promessa com uma mensagem de erro
          reject("Erro na verificação do token");
        } else {
          // Verifique se 'userData' é uma string (erro) ou um objeto (dados do usuário)
          if (typeof userData === "string") {
            reject("Erro na verificação do token");
          } else {
            // 'userData' é um objeto UserData válido
            resolve(userData as UserData);
          }
        }
      });
    } else {
      reject("Sem token");
    }
  });
}

app.get("/teste", (req, res) => {
  res.json({ teste: "teste 234" });
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;

    const messages = await MessageModel.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Ocorreu um erro ao buscar os dados do usuário" });
  }
});

app.get("/people", async (req, res) => {
  const users = await UserModel.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;

  if (token) {
    jwt.verify(token, jwtSecret as string, {}, (err, userData) => {
      if (err) throw err;

      res.json(userData);
    });
  } else {
    res.status(401).json("sem token");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await UserModel.findOne({ username });

  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password as string);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret as string,
        {},
        (err, token) => {
          res.cookie("token", token).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await UserModel.findOne({ username });

    if (existingUser) {
      // Se um usuário com o mesmo nome de usuário já existe, retorne um erro
      return res.status(400).json({ error: "Nome de usuário já está em uso." });
    }

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

    const createdUser = await UserModel.create({
      username,
      password: hashedPassword,
    });

    if (jwtSecret !== undefined) {
      await jwt.sign(
        { userId: createdUser._id, username },
        jwtSecret,
        {},
        (err: Error | null, token: string | undefined) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)
            .json({
              id: createdUser._id,
            });
        }
      );
    } else {
      console.log("MINHA_VARIAVEL_DE_AMBIENTE não está definida");
    }
  } catch (err) {
    if (err) throw err;
    res.status(500).json("error");
  }
});

const server = app.listen(4000, () => console.log("Servidor rodando"));

const wss = new ws.WebSocketServer({ server });

interface CustomWebSocket extends ws {
  userId: string;
  username: string;
  isAlive: boolean;
  timer: NodeJS.Timeout | null;
  deathTimer: NodeJS.Timeout;
}
const connectedClients: CustomWebSocket[] = [];

wss.on("connection", (connection: CustomWebSocket, req) => {
  connection.on("close", () => {
    // Cliente desconectado
    const disconnectedUserId = connection.userId;

    // Remova o cliente desconectado da lista de clientes conectados
    const index = connectedClients.findIndex(
      (client) => client.userId === disconnectedUserId
    );

    if (index !== -1) {
      connectedClients.splice(index, 1);
    }

    // Notifique todos os clientes restantes sobre a desconexão
    const onlineUsers = connectedClients.map((client) => ({
      userId: client.userId,
      username: client.username,
    }));

    connectedClients.forEach((client) => {
      client.send(JSON.stringify({ online: onlineUsers }));
    });
  });

  const cookies = req.headers.cookie;
  // pega o username e o id do cookie para essa connection
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret as string, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData as jwt.JwtPayload;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = message.toString();
    if (messageData === JSON.stringify({ disconnect: true })) {
      // Realize as ações necessárias para desconexão
      const disconnectedUserId = connection.userId;

      // Remova o cliente desconectado da lista de clientes conectados
      const index = connectedClients.findIndex(
        (client) => client.userId === disconnectedUserId
      );

      if (index !== -1) {
        connectedClients.splice(index, 1);
      }

      // Notifique os outros clientes sobre a desconexão
      const onlineUsers = connectedClients.map((client) => ({
        userId: client.userId,
        username: client.username,
      }));

      connectedClients.forEach((client) => {
        client.send(JSON.stringify({ online: onlineUsers }));
      });

      return; // Não prossiga com o código de tratamento de mensagens
    }

    const { recipient, text, file } = JSON.parse(messageData);

    let filename: string | null = null;
    if (file) {
      const data = file.data.split(",")[1];
      const bufferData = Buffer.from(data, "base64");

      const parts = file.name.split(".");
      const exts = parts[parts.length - 1];
      filename = Date.now() + "." + exts;
      const path = __dirname + "/uploads/" + filename;
      fs.writeFile(path, bufferData, () => {
        console.log("file save" + path);
      });
    }

    if (recipient && (text || file)) {
      const messageDoc = await MessageModel.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });

      connectedClients
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              file: filename,
              sender: connection.userId,
              recipient,
              _id: messageDoc._id,
            })
          )
        );
    }
  });

  connectedClients.push(connection);
  const onlineUsers = connectedClients.map((client) => ({
    userId: client.userId,
    username: client.username,
  }));

  connectedClients.forEach((client) => {
    client.send(JSON.stringify({ online: onlineUsers }));
  });
});
