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

app.set("trust proxy", 1)
app.use(cookieParser())
app.use(express.json())

const allowedOrigins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://meatify-frontend-production.up.railway.app",
  "https://meatify-frontend.onrender.com",
]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
}

app.use(cors(corsOptions))

app.all("/{*splat}", setupAsyncLocalStorage)
setupSocketAPI(server)


app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/station", stationRoutes)
app.use("/api/song", songsRoutes)

const port = process.env.PORT || 3030

server.listen(port, () => {
  logger.info("Server is running on port: " + port)
})
