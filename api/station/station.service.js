import { ObjectId } from "mongodb"

import { dbService } from "../../services/db.service.js"
import { songService } from "../song/song.service.js"
import { logger } from "../../services/logger.service.js"

import { makeId } from "../../services/util.service.js"

export const stationService = {
  query,
  getById,
  save,
  remove,
  addSongToStation,
  removeSongFromStation,
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
      if (!stationToSave.songs) stationToSave.songs = []

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

async function addSongToStation(stationId, songId) {
  const song = await songService.getById(songId)
  if (!song) throw new Error("Song not found.")

  const collection = await dbService.getCollection("stations")

  const updatedStation = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(stationId) },
    { $addToSet: { songs: song } },
    { returnDocument: "after" },
  )

  if (!updatedStation) throw new Error("Station not found.")

  return updatedStation
}

async function removeSongFromStation(stationId, songId) {
  const collection = await dbService.getCollection("stations")

  const updatedStation = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(stationId) },
    { $pull: { songs: { _id: songId } } },
    { returnDocument: "after" },
  )
  if (!updatedStation) throw new Error("Station not found.")

  return updatedStation
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


export let TAGS_DATA = []

const TAG_COLORS = {
    Pop: '#f16cd5', 'Hip Hop': '#b74aff', Rock: '#E8115B', Electronic: '#3edd3e',
    Latin: '#E13300', 'K-Pop': '#af2896', Chill: '#477D95', Workout: '#f7b968',
    Party: '#c268f7', Focus: '#dd9e6a', Sleep: '#2D46B9', Gaming: '#27856A',
    Driving: '#8f8e8d', Mood: '#509BF5', Trending: '#ee632c', Jazz: '#6C5B7B',
    'R&B': '#9B5DE5', Indie: '#2A9D8F', Reggae: '#2F9E44', Metal: '#4a4a4a',
    Classical: '#8B5E3C', Country: '#C97B3D', Blues: '#1E4E8C', Folk: '#6B8E4E',
    Funk: '#D9822B', Soul: '#A63A50', Punk: '#D6001C', Ambient: '#3C6E71',
    Disco: '#B23AEE', Romance: '#E85D75', Study: '#5B7C99', Roadtrip: '#F2A65A',
    Motivation: '#E8590C', Throwback: '#9C6644', Liked: '#5038a0', Israeli: '#0038b8'
}

const TAG_SEARCH_QUERIES = {
    Pop: 'pop concert stage', 'Hip Hop': 'hip hop street', Rock: 'rock band guitar',
    Electronic: 'electronic music neon', Latin: 'latin dance music',
    'K-Pop': 'kpop stage lights', Chill: 'chill lounge relax', Workout: 'gym workout fitness',
    Party: 'party crowd dance', Focus: 'focus desk work', Sleep: 'sleep night dark',
    Gaming: 'gaming setup neon', Driving: 'driving night road', Mood: 'mood aesthetic vibe',
    Trending: 'trending viral colorful', Jazz: 'jazz saxophone club',
    'R&B': 'neon microphone stage red', Indie: 'indie bedroom aesthetic', Reggae: 'reggae beach sunset',
    Metal: 'metal concert dark', Classical: 'classical piano orchestra', Country: 'country road field',
    Blues: 'blues guitar smoky', Folk: 'folk acoustic cabin', Funk: 'funk disco groove',
    Soul: 'vinyl record player warm light', Punk: 'punk mosh pit crowd', Ambient: 'foggy misty landscape minimal',
    Disco: 'disco ball party', Romance: 'romance candles couple', Study: 'study library books',
    Roadtrip: 'roadtrip highway sunset', Motivation: 'motivation sunrise mountain', Throwback: 'retro vintage 80s',
    Liked: 'heart love music', Israeli: 'tel aviv skyline night'
}

const UNSPLASH_ACCESS_KEY = '0NmFdVz_ARctvjTEja7Z_TVqqyZXldYAGGg_21lHWQ0'
const LASTFM_API_KEY = '05855db705ab67b60735b4fcfbcc4d85'

async function initTagsData() {
    if (TAGS_DATA.length) return TAGS_DATA
    TAGS_DATA = await buildTagsData()
    return TAGS_DATA
}

function upscaleImageUrl(url, size) {
    if (!url) return url
    return url.replace(/([?&])w=\d+&h=\d+/, `$1w=${size}&h=${size}`)
}


