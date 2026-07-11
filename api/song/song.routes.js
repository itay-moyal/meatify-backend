import express from "express"
import { getSongs, getSongById, getArtist } from "./song.controller.js"
import { log } from "../../middlewares/logger.middleware.js"
export const songsRoutes = express.Router()

songsRoutes.get("/", log, getSongs)
songsRoutes.get("/:id", log, getSongById)
songsRoutes.get("/:id/artists/:id", log, getArtist)