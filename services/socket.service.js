import { logger } from "./logger.service.js"
import { Server } from "socket.io"

var gIo = null

export function setupSocketAPI(http) {
  gIo = new Server(http, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://127.0.0.1:5173",
          "http://localhost:5173",
          "http://127.0.0.1:3000",
          "http://localhost:3000",
          "https://meatify-frontend-production.up.railway.app",
        ]

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error("Not allowed by CORS"))
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  })
  gIo.on("connection", (socket) => {
    logger.info(`New connected socket [id: ${socket.id}]`)

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected [id: ${socket.id}] reason: ${reason}`)
    })

    socket.on("station-watch", (stationId) => {
      if (!stationId) return
      const room = `station:${stationId}`
      socket.join(room)
      logger.info(`Socket ${socket.id} joined room ${room}`)
    })

    socket.on("station-unwatch", (stationId) => {
      if (!stationId) return
      const room = `station:${stationId}`
      socket.leave(room)
      logger.info(`Socket ${socket.id} left room ${room}`)
    })

    socket.on("set-user-socket", (userId) => {
      socket.userId = userId.toString()
      logger.info(
        `Setting socket.userId = ${userId} for socket [id: ${socket.id}]`,
      )
    })

    socket.on("unset-user-socket", () => {
      logger.info(`Removing socket.userId for socket [id: ${socket.id}]`)
      delete socket.userId
    })

    socket.on("watch-user", (userId) => {
      socket.join(`user:${userId}`)
    })

    socket.on("unwatch-user", (userId) => {
      socket.leave(`user:${userId}`)
    })
  })
}

function emitTo({ type, data, room = null }) {
  if (room) gIo.to(room).emit(type, data)
  else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
  if (!userId) return
  userId = userId.toString()
  const socket = await _getUserSocket(userId)

  if (socket) {
    logger.info(
      `Emiting event: ${type} to user: ${userId} socket [id: ${socket.id}]`,
    )
    socket.emit(type, data)
  } else {
    logger.info(`No active socket for user: ${userId}`)
    // _printSockets()
  }
}

// If possible, send to all sockets BUT not the current socket
// Optionally, broadcast to a room / to all

async function broadcast({ type, data, room = null, userId = null }) {
  logger.info(`Broadcasting event: ${type}`)

  const excludedSocket = userId ? await _getUserSocket(userId.toString()) : null

  if (room && excludedSocket) {
    logger.info(`Broadcast to room ${room} excluding user: ${userId}`)
    excludedSocket.broadcast.to(room).emit(type, data)
  } else if (excludedSocket) {
    logger.info(`Broadcast to all excluding user: ${userId}`)
    excludedSocket.broadcast.emit(type, data)
  } else if (room) {
    logger.info(`Emit to room: ${room}`)
    gIo.to(room).emit(type, data)
  } else {
    logger.info(`Emit to all`)
    gIo.emit(type, data)
  }
}

async function _getUserSocket(userId) {
  const sockets = await _getAllSockets()
  const socket = sockets.find((s) => s.userId === userId)
  return socket
}
async function _getAllSockets() {
  // return all Socket instances
  const sockets = await gIo.fetchSockets()
  return sockets
}

async function _printSockets() {
  const sockets = await _getAllSockets()
  console.log(`Sockets: (count: ${sockets.length}):`)
  sockets.forEach(_printSocket)
}
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

export const socketService = {
  // set up the sockets service and define the API
  setupSocketAPI,
  // emit to everyone / everyone in a specific room (label)
  emitTo,
  // emit to a specific user (if currently active in system)
  emitToUser,
  // Send to all sockets BUT not the current socket - if found
  // (otherwise broadcast to a room / to all)
  broadcast,
}
