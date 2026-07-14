import { ObjectId } from "mongodb"
import axios from "axios"

import { dbService } from "../../services/db.service.js"
import { songService } from "../song/song.service.js"
import { logger } from "../../services/logger.service.js"
import { makeId } from "../../services/util.service.js"

export const stationService = {
  query,
  getById,
  getByIds,
  save,
  remove,
  addSongToStation,
  removeSongFromStation,
  getTagsData,
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
      return { ...stationToSave, _id: stationToSave._id }
    } catch (err) {
      logger.error(`cannot update station`, err)
      throw err
    }
  } else {
    try {
      if (!stationToSave.songs) stationToSave.songs = []
      if (!stationToSave.tags) stationToSave.tags = []
      if (stationToSave.savedCount === undefined) stationToSave.savedCount = 0

      if (!stationToSave.createdAt) stationToSave.createdAt = Date.now()

      const result = await collection.insertOne(stationToSave)
      return { ...stationToSave, _id: result.insertedId.toString() }
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

async function addSongToStation(stationId, songId) {
  const song = await songService.getById(songId)
  if (!song) throw new Error("Song not found.")

  const collection = await dbService.getCollection("stations")

  const updatedStation = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(stationId) },
    { $addToSet: { songs: songId } },
    { returnDocument: "after", includeResultMetadata: false },
  )

  if (!updatedStation) throw new Error("Station not found.")

  await songService.addStationRef(songId, stationId)
  return updatedStation
}

async function removeSongFromStation(stationId, songId) {
  const collection = await dbService.getCollection("stations")

  const updatedStation = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(stationId) },
    { $pull: { songs: songId } },
    { returnDocument: "after", includeResultMetadata: false },
  )

  if (!updatedStation) throw new Error("Station not found.")

  await songService.removeStationRef(songId, stationId)
  return updatedStation
}

async function getByIds(stationIds) {
  const collection = await dbService.getCollection("stations")

  return collection
    .find({
      _id: { $in: stationIds.map((id) => ObjectId.createFromHexString(id)) },
    })
    .toArray()
}

function _buildCriteria(filterBy = {}) {
  const criteria = {}

  if (filterBy.txt) {
    const txtRegex = { $regex: filterBy.txt, $options: "i" }

    criteria.$or = [{ name: txtRegex }, { tags: txtRegex }]
  }

  return criteria
}

const TAG_COLORS = {
  Pop: "#f16cd5",
  "Hip Hop": "#b74aff",
  Rock: "#E8115B",
  Electronic: "#3edd3e",
  Latin: "#E13300",
  "K-Pop": "#af2896",
  Chill: "#477D95",
  Workout: "#f7b968",
  Party: "#c268f7",
  Focus: "#dd9e6a",
  Sleep: "#2D46B9",
  Gaming: "#27856A",
  Driving: "#8f8e8d",
  Mood: "#509BF5",
  Trending: "#ee632c",
  Jazz: "#6C5B7B",
  "R&B": "#9B5DE5",
  Indie: "#2A9D8F",
  Reggae: "#2F9E44",
  Metal: "#4a4a4a",
  Classical: "#8B5E3C",
  Country: "#C97B3D",
  Blues: "#1E4E8C",
  Folk: "#6B8E4E",
  Funk: "#D9822B",
  Soul: "#A63A50",
  Punk: "#D6001C",
  Ambient: "#3C6E71",
  Disco: "#B23AEE",
  Romance: "#E85D75",
  Study: "#5B7C99",
  Roadtrip: "#F2A65A",
  Motivation: "#E8590C",
  Throwback: "#9C6644",
  Liked: "#5038a0",
  Israeli: "#0038b8",
}

const TAG_SEARCH_QUERIES = {
  Pop: "pop concert stage",
  "Hip Hop": "hip hop street",
  Rock: "rock band guitar",
  Electronic: "electronic music neon",
  Latin: "latin dance music",
  "K-Pop": "kpop stage lights",
  Chill: "chill lounge relax",
  Workout: "gym workout fitness",
  Party: "party crowd dance",
  Focus: "focus desk work",
  Sleep: "sleep night dark",
  Gaming: "gaming setup neon",
  Driving: "driving night road",
  Mood: "mood aesthetic vibe",
  Trending: "trending viral colorful",
  Jazz: "jazz saxophone club",
  "R&B": "neon microphone stage red",
  Indie: "indie bedroom aesthetic",
  Reggae: "reggae beach sunset",
  Metal: "metal concert dark",
  Classical: "classical piano orchestra",
  Country: "country road field",
  Blues: "blues guitar smoky",
  Folk: "folk acoustic cabin",
  Funk: "funk disco groove",
  Soul: "vinyl record player warm light",
  Punk: "punk mosh pit crowd",
  Ambient: "foggy misty landscape minimal",
  Disco: "disco ball party",
  Romance: "romance candles couple",
  Study: "study library books",
  Roadtrip: "roadtrip highway sunset",
  Motivation: "motivation sunrise mountain",
  Throwback: "retro vintage 80s",
  Liked: "heart love music",
  Israeli: "tel aviv skyline night",
}

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
let tagsDataCache = null

async function fetchTagImageFromUnsplash(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish&client_id=${UNSPLASH_ACCESS_KEY}`
  try {
    const { data } = await axios.get(url)
    const photo = data?.results?.[0]
    if (!photo) throw new Error("No results")
    return `${photo.urls.raw}&w=400&h=400&fit=crop&crop=faces,entropy&q=80`
  } catch (err) {
    logger.error(`Unsplash fetch failed for "${query}"`, err.message)
    return ""
  }
}

async function getTagsData() {
  if (tagsDataCache) return tagsDataCache

  const entries = await Promise.all(
    Object.keys(TAG_COLORS).map(async (title) => ({
      title,
      color: TAG_COLORS[title],
      imgUrl: await fetchTagImageFromUnsplash(
        TAG_SEARCH_QUERIES[title] || title,
      ),
    })),
  )

  tagsDataCache = entries
  return entries
}
