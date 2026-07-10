import { ObjectId } from "mongodb"

import { dbService } from "../../services/db.service.js"

export const songService = {
  query,
  getById,
}

async function query(filterBy = {}) {
  try {
    const criteria = _buildCriteria(filterBy)
    const collection = await dbService.getCollection("songs")

    const songs = await collection.find(criteria).limit(50).toArray()
    return songs
  } catch (err) {
    console.error("Cannot find songs", err)
    throw err
  }
}

async function getById(songId) {
  try {
    const collection = await dbService.getCollection("songs")
    const song = await collection.findOne({ _id: new ObjectId(songId) })
    return song
  } catch (err) {
    console.error(`Cannot find song ${songId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}

  if (filterBy.txt) {
    const regex = new RegExp(filterBy.txt, "i")
    criteria.$or = [
      { title: { $regex: regex } },
      { album: { $regex: regex } },
      { "artists.name": { $regex: regex } },
    ]
  }

  if (filterBy.tag) {
    criteria.tags = { $in: [filterBy.tag] }
  }

  return criteria
}
