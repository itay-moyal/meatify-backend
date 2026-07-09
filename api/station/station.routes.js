import express from "express"

import { log } from "../../middlewares/logger.middleware.js"

//prettier-ignore
import { getStations, getStationById, saveStation } from "./station.controller.js"

export const stationRoutes = express.Router()

stationRoutes.get("/", log, getStations)
stationRoutes.get("/:id", log, getStationById)
stationRoutes.post("/", saveStation) // Add
stationRoutes.put("/:id", saveStation) // Update
