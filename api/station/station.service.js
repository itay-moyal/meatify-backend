import { ObjectId } from "mongodb"

import { dbService } from "../../services/db.service.js"
import { logger } from "../../services/logger.service.js"

import { makeId } from "../../services/util.service.js"

export const stationService = {
  query,
  getById,
  save,
}

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy)
  try {
    const collection = await dbService.getCollection("stations")
    var stations = await collection.find(criteria).toArray()

    stations = stations.map((station) => {
      station.createdAt = station._id.getTimestamp()
      return station
    })
    return stations
  } catch (err) {
    logger.error("cannot find stations", err)
    throw err
  }
}

async function getById(stationId) {
  try {
    const collection = await dbService.getCollection("stations")
    const station = await collection.findOne({
      _id: ObjectId.createFromHexString(stationId),
    })
    if (!station) return

    station.createdAt = station._id.getTimestamp()
    return station
  } catch (err) {
    logger.error(`error while finding station`, err)
    throw err
  }
}

async function save(stationToSave) {
  const collection = await dbService.getCollection("stations")
  if (stationToSave._id) {
    try {
      const stationId = ObjectId.createFromHexString(stationToSave._id)
      const { _id, ...updateData } = stationToSave

      await collection.updateOne({ _id: stationId }, { $set: updateData })
      return stationToSave
    } catch (err) {
      logger.error(`cannot update station`, err)
      throw err
    }
  } else {
    try {
      if (!stationToSave.songIds) stationToSave.songIds = []

      await collection.insertOne(stationToSave)
      return stationToSave
    } catch (err) {
      logger.error("cannot insert station", err)
      throw err
    }
  }
}


async function remove(stationId) {
  try {
    const collection = await dbService.getCollection("stations")
    await collection.deleteOne({ _id: ObjectId.createFromHexString(stationId) })
  } catch (err) {
    logger.error(`cannot remove station`, err)
    throw err
  }
}



function _buildCriteria(filterBy = {}) {
  if (!filterBy) return {}
  const criteria = {}
  if (filterBy.txt) {
    const txtRegex = { $regex: filterBy.txt, $options: "i" }

    criteria.$or = [{ title: txtRegex }, { artists: txtRegex }]
  }
  if (filterBy.tags && filterBy.tags.length > 0) {
    criteria.tags = { $in: filterBy.tags }
  }
  return criteria
}
