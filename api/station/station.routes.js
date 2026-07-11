import express from "express"

import { log } from "../../middlewares/logger.middleware.js"

//prettier-ignore
import { getStations, getStationById, saveStation, removeStation, removeSong, addSong, getByIds } from "./station.controller.js"

export const stationRoutes = express.Router()

stationRoutes.get("/",  getStations)
stationRoutes.get("/:id",  getStationById)
stationRoutes.post("/", saveStation) // Add Station
stationRoutes.put("/:id", saveStation) // Update Station
stationRoutes.delete("/:id", removeStation) // Remove Station
stationRoutes.put("/:id/song/:songId", addSong) // Add song
stationRoutes.delete("/:id/song/:songId", removeSong) // Delete song
stationRoutes.post("/getIds", getByIds)