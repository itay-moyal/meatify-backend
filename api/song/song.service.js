import { ObjectId } from "mongodb"
import axios from "axios"

import { dbService } from "../../services/db.service.js"
import { logger } from "../../services/logger.service.js"

export const songService = {
  query,
  getById,
  getArtistInfoByName,
  getArtistInfoFromSong,
  addStationRef,
  removeStationRef,
}

async function query(filterBy = {}) {
  try {
    const criteria = _buildCriteria(filterBy)
    const collection = await dbService.getCollection("songs")

    const songs = await collection.find(criteria).limit(50).toArray()
    return songs
  } catch (err) {
    logger.error("cannot find songs", err)
    throw err
  }
}

async function getById(songId) {
  try {
    const collection = await dbService.getCollection("songs")
    const song = await collection.findOne({
      _id: ObjectId.createFromHexString(songId),
    })

    if (!song) throw new Error(`Song ${songId} not found`)

    if (song.artists?.[0]?.name) {
      song.artistInfo = await getArtistInfoByName(song.artists[0].name)
    }

    return song
  } catch (err) {
    logger.error(`cannot find song ${songId}`, err)
    throw err
  }
}

async function addStationRef(songId, stationId) {
  try {
    const collection = await dbService.getCollection("songs")
    await collection.updateOne(
      { _id: ObjectId.createFromHexString(songId) },
      { $addToSet: { stationIds: stationId } }
    )
  } catch (err) {
    logger.error(`cannot add station ref to song ${songId}`, err)
    throw err
  }
}

async function removeStationRef(songId, stationId) {
  try {
    const collection = await dbService.getCollection("songs")
    await collection.updateOne(
      { _id: ObjectId.createFromHexString(songId) },
      { $pull: { stationIds: stationId } }
    )
  } catch (err) {
    logger.error(`cannot remove station ref from song ${songId}`, err)
    throw err
  }
}

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const artistInfoCache = new Map()

async function getArtistInfoByName(artistName) {
  if (artistInfoCache.has(artistName)) {
    return artistInfoCache.get(artistName)
  }

  const info = { name: artistName, bio: '', monthlyListeners: 0, imgUrl: '', fans: 0 }

  try {
    const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`
    const { data: lastfmJson } = await axios.get(lastfmUrl)
    const artist = lastfmJson?.artist

    if (artist) {
      const rawBio = artist.bio?.summary || ''
      info.bio = rawBio.replace(/<a href.*?<\/a>/gi, '').trim()
      info.monthlyListeners = Number(artist.stats?.listeners) || 0
      info.fans = Number(artist.stats?.playcount) || 0
    }
  } catch (err) {
    logger.warn(`Last.fm fetch failed for ${artistName}`, err.message)
  }

  try {
    const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
    const { data: deezerJson } = await axios.get(deezerUrl)
    const deezerArtist = deezerJson?.data?.[0]

    if (deezerArtist) {
      info.imgUrl = deezerArtist.picture_xl || deezerArtist.picture_big || ''
      if (!info.fans) info.fans = deezerArtist.nb_fan || 0
    }
  } catch (err) {
    logger.warn(`Deezer artist fetch failed for ${artistName}`, err.message)
  }

  if (!info.bio) {
    info.bio = `${artistName} is a featured artist on this platform.`
  }

  artistInfoCache.set(artistName, info)
  return info
}

async function getArtistInfoFromSong(songId) {
  const collection = await dbService.getCollection("songs")
  const song = await collection.findOne({
    _id: ObjectId.createFromHexString(songId),
  })

  if (!song) throw new Error('Song not found')

  const artist = song.artists?.[0]
  if (!artist) throw new Error('No artist found on this song')

  return getArtistInfoByName(artist.name)
}

function _buildCriteria(filterBy = {}) {
  if (!filterBy) return {}
  const criteria = {}
  if (filterBy.txt) {
    const txtRegex = { $regex: filterBy.txt, $options: "i" }
    criteria.$or = [{ name: txtRegex }, { tags: txtRegex }]
  }
  if (filterBy.tags && filterBy.tags.length > 0) {
    criteria.tags = { $in: filterBy.tags }
  }

  return criteria
}