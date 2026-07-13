import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
import http from "http"

import { logger } from "./services/logger.service.js"
import { setupAsyncLocalStorage } from "./middlewares/setupAls.middleware.js"
import { authRoutes } from "./api/auth/auth.routes.js"
import { userRoutes } from "./api/user/user.routes.js"
import { stationRoutes } from "./api/station/station.routes.js"
import { songsRoutes } from "./api/song/song.routes.js"

import { setupSocketAPI } from "./services/socket.service.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

logger.info("server.js loaded...")

const app = express()
const server = http.createServer(app)

app.use(cookieParser())
app.use(express.json())

setupSocketAPI(server)

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "public")))
  console.log("__dirname: ", __dirname)
} else {
  const corsOptions = {
    origin: [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ],
    credentials: true,
  }
  app.use(cors(corsOptions))
}

app.all("/{*splat}", setupAsyncLocalStorage)

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/station", stationRoutes)
app.use("/api/song", songsRoutes)

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "public")))

  app.get("{*splat}", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public", "index.html"))
  })
}

const port = process.env.PORT || 3030

server.listen(port, () => {
  logger.info("Server is running on port: " + port)
})
