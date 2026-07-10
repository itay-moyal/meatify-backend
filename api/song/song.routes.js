import express from "express"
import { getSongs, getSongById } from "./song.controller.js"
import { log } from "../../middlewares/logger.middleware.js"
export const songsRoutes = express.Router()

songsRoutes.get("/", log, getSongs)
songsRoutes.get("/:id", log, getSongById)
