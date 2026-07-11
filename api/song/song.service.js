import { ObjectId } from "mongodb"

import { dbService } from "../../services/db.service.js"
import { log } from "../../middlewares/logger.middleware.js"

export const songService = {
  query,
  getById,
  getArtistInfo

}
const UNSPLASH_ACCESS_KEY = '0NmFdVz_ARctvjTEja7Z_TVqqyZXldYAGGg_21lHWQ0'
const LASTFM_API_KEY = '05855db705ab67b60735b4fcfbcc4d85'
const artistInfoCache = {}


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
    song.artistInfo = await getArtistInfo(song.artists[0].name)
    
  
    console.log('artist',song.artistInfo);
    
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


async function getArtistInfo(artistName) {
  return await fetchArtistInfo(artistName)
}
async function fetchArtistInfo(artistName) {
    if (artistInfoCache[artistName]) return artistInfoCache[artistName]

    const info = { name: artistName, bio: '', monthlyListeners: 0, imgUrl: '', fans: 0 }

    try {
        const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`
        const lastfmRes = await fetch(lastfmUrl)
        const lastfmJson = await lastfmRes.json()
        const artist = lastfmJson?.artist

        if (artist) {
            const rawBio = artist.bio?.summary || ''
            info.bio = rawBio.replace(/<a href.*?<\/a>/gi, '').trim()
            info.monthlyListeners = Number(artist.stats?.listeners) || 0
            info.fans = Number(artist.stats?.playcount) || 0
        }
    } catch (err) {
        console.warn(`Last.fm fetch failed for ${artistName}`, err)
    }

    try {
        const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
        const deezerJson = await jsonpRequest(deezerUrl)
        const deezerArtist = deezerJson?.data?.[0]

        if (deezerArtist) {
            info.imgUrl = deezerArtist.picture_xl || deezerArtist.picture_big || ''
            if (!info.fans) info.fans = deezerArtist.nb_fan || 0
        }
    } catch (err) {
        console.warn(`Deezer artist fetch failed for ${artistName}`, err)
    }

    if (!info.bio) {
        info.bio = `${artistName} is a featured artist on this platform.`
    }

    artistInfoCache[artistName] = info
    return info
}


function jsonpRequest(url) {
return ''
}