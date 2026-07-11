import express from "express"
import { getStations, getStationById, saveStation, removeStation, addSong, removeSong, getByIds, getTags } from "./station.controller.js"
import { log } from "../../middlewares/logger.middleware.js"

export const stationRoutes = express.Router()

stationRoutes.get("/tags", log, getTags)        // ← must be first
stationRoutes.post("/by-ids", log, getByIds)     // ← must be before /:id too
stationRoutes.get("/", log, getStations)
stationRoutes.get("/:id", log, getStationById)
stationRoutes.post("/", log, saveStation)
stationRoutes.put("/:id", log, saveStation)
stationRoutes.delete("/:id", log, removeStation)
stationRoutes.post("/:id/song/:songId", log, addSong)
stationRoutes.delete("/:id/song/:songId", log, removeSong)