import { logger } from "../../services/logger.service.js"
import { stationService } from "./station.service.js"

export async function getStations(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      tags: req.query.tags ? req.query.tags.split(',') : [],
    }
    const stations = await stationService.query(filterBy)
    res.json(stations)
  } catch (err) {
    logger.error("Failed to get stations", err)
    res.status(400).json({ error: "Failed to get stations" })
  }
}

export async function getStationById(req, res) {
  const stationId = req.params.id
  try {
    const station = await stationService.getById(stationId)
    if (!station) return res.status(404).send(`Station not found`)
    res.json(station)
  } catch (err) {
    logger.error(err)
    res.status(404).send(`Cannot find station`)
  }
}

export async function saveStation(req, res) {
  const station = { ...req.body }

  if (req.params.id) {
    station._id = req.params.id
  }
  try {
    const savedStation = await stationService.save(station)
    return res.json(savedStation)
  } catch (err) {
    logger.error(err)
    res.status(404).send(`Cannot save station`)
  }
}

export async function removeStation(req, res) {
  const stationId = req.params.id

  try {
    await stationService.remove(stationId)
    res.send({ msg: "Station removed successfully", stationId })
  } catch (err) {
    logger.error(err)
    res.status(400).send(`Cannot remove station`)
  }
}

export async function addSong(req, res) {
  const stationId = req.params.id
  const songId = req.params.songId
  try {
    const updatedStation = await stationService.addSongToStation(
      stationId,
      songId,
    )
    return res.json(updatedStation)
  } catch (err) {
    logger.error(err)
    res.status(400).send(`Cannot add song to station.`)
  }
}

export async function removeSong(req, res) {
  const stationId = req.params.id
  const songId = req.params.songId
  try {
    const updatedStation = await stationService.removeSongFromStation(
      stationId,
      songId,
    )
    res.send(updatedStation)
  } catch (err) {
    logger.error(err)
    res.status(400).send(`Cannot remove song from station.`)
  }
}

export async function getByIds(req, res) {
  try {
    const { stationIds } = req.body
    const stations = await stationService.getByIds(stationIds)
    res.json(stations)
  } catch (err) {
    logger.error(err)
    res.status(500).send({ err: "Failed to get stations" })
  }
}

export async function getTags(req, res) {
  try {
    const tags = await stationService.getTagsData()
    res.json(tags)
  } catch (err) {
    logger.error("Failed to get tags", err)
    res.status(500).json({ error: "Failed to get tags" })
  }
}