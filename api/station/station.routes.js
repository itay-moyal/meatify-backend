import express from "express"

import { log } from "../../middlewares/logger.middleware.js"

//prettier-ignore
import { getStations, getStationById, saveStation,removeSong,addSong } from "./station.controller.js"

export const stationRoutes = express.Router()

stationRoutes.get("/", log, getStations)
stationRoutes.get("/:id", log, getStationById)
stationRoutes.post("/", saveStation) // Add
stationRoutes.put("/:id", saveStation) // Update
stationRoutes.put("/:id/song", addSong) // Add song
stationRoutes.delete("/:id/song/:songId", removeSong) // Delete song
