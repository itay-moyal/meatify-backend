// Seeds users, stations and songs into the DB from MONGO_URL.
// Songs are fetched from the same public search APIs the app already uses
// (iTunes + Deezer); nothing is invented. Run with: npm run seed
import { MongoClient, ObjectId } from "mongodb"
import axios from "axios"

import { config } from "../config/index.js"

const MONGO_URL = process.env.MONGO_URL
if (!MONGO_URL) {
  console.error("MONGO_URL is not set. Add it to .env (run via `npm run seed`).")
  process.exit(1)
}

// songService.query() caps at 300, and the station page resolves song ids
// against that list, so never seed more than this.
const MAX_SONGS = 290
const SONGS_PER_GENRE = 14
const MIN_STATION_SONGS = 15
const MAX_STATION_SONGS = 30
const MAX_PER_ARTIST_PER_GENRE = 2

const GENRES = [
  { tags: ["Pop", "Trending", "Party"], station: "Pop Prism", queries: ["pop hits", "Dua Lipa", "Harry Styles"] },
  { tags: ["Hip Hop", "Workout", "Party"], station: "Midnight Cypher", queries: ["hip hop", "Kendrick Lamar", "Travis Scott"] },
  { tags: ["Rock", "Driving", "Motivation"], station: "Guitar Weather", queries: ["classic rock", "Foo Fighters", "Arctic Monkeys"] },
  { tags: ["Electronic", "Party", "Gaming"], station: "Neon Pulse", queries: ["electronic", "Daft Punk", "Disclosure"] },
  { tags: ["Latin", "Party", "Mood"], station: "Latin Heatwave", queries: ["latin hits", "Bad Bunny", "Karol G"] },
  { tags: ["K-Pop", "Trending", "Party"], station: "Seoul Spark", queries: ["k-pop", "BLACKPINK", "NewJeans"] },
  { tags: ["Jazz", "Focus", "Sleep"], station: "Blue Hour Jazz", queries: ["jazz", "Miles Davis", "John Coltrane"] },
  { tags: ["R&B", "Romance", "Mood"], station: "Velvet R&B", queries: ["rnb", "SZA", "Frank Ocean"] },
  { tags: ["Indie", "Chill", "Focus"], station: "Indie Apartment", queries: ["indie", "Tame Impala", "Phoebe Bridgers"] },
  { tags: ["Reggae", "Chill", "Roadtrip"], station: "Island Drift", queries: ["reggae", "Bob Marley", "Damian Marley"] },
  { tags: ["Metal", "Workout", "Motivation"], station: "Iron Circuit", queries: ["heavy metal", "Metallica", "Gojira"] },
  { tags: ["Classical", "Study", "Focus"], station: "Quiet Conservatory", queries: ["classical piano", "Chopin", "Debussy"] },
  { tags: ["Country", "Roadtrip", "Throwback"], station: "Country Roads", queries: ["country", "Chris Stapleton", "Dolly Parton"] },
  { tags: ["Blues", "Mood", "Chill"], station: "Blue Smoke", queries: ["blues", "B.B. King", "Muddy Waters"] },
  { tags: ["Folk", "Chill", "Roadtrip"], station: "Cabin Session", queries: ["folk", "Bon Iver", "Joni Mitchell"] },
  { tags: ["Funk", "Party", "Disco"], station: "Pocket Groove", queries: ["funk", "Kool & The Gang", "Parliament"] },
  { tags: ["Soul", "Romance", "Mood"], station: "Warm Vinyl Soul", queries: ["soul", "Aretha Franklin", "Otis Redding"] },
  { tags: ["Punk", "Rock", "Motivation"], station: "Three Chords", queries: ["punk rock", "Green Day", "The Clash"] },
  { tags: ["Ambient", "Sleep", "Focus"], station: "Weightless Room", queries: ["ambient", "Brian Eno", "Tycho"] },
  { tags: ["Disco", "Party", "Throwback"], station: "Studio 79", queries: ["disco", "Donna Summer", "Bee Gees"] },
]

const USERS = [
  { username: "user0", fullname: "Will Smooth", isAdmin: true },
  { username: "user1", fullname: "Jordan Johnson" },
  { username: "user2", fullname: "Casey Williams" },
  { username: "user3", fullname: "Morgan Brown" },
  { username: "user4", fullname: "Taylor Jones" },
  { username: "user5", fullname: "Riley Garcia" },
  { username: "user6", fullname: "Sam Miller" },
  { username: "user7", fullname: "Jamie Davis" },
]
// auth.service.login compares the password as plain text (bcrypt is commented out)
const DEMO_PASSWORD = "123"

const DAY = 24 * 60 * 60 * 1000

main().catch((err) => {
  console.error("Seed failed:", String(err?.message || err).replaceAll(MONGO_URL, "<MONGO_URL>"))
  process.exit(1)
})

async function main() {
  const genrePools = []
  for (const genre of GENRES) {
    const pool = await fetchGenrePool(genre)
    console.log(`Fetched ${pool.length} tracks for ${genre.tags[0]}`)
    genrePools.push(pool)
  }

  const seen = new Set()
  const songs = []
  const genreSongIdx = genrePools.map(() => [])
  genrePools.forEach((pool, gIdx) => {
    for (const track of pool) {
      if (genreSongIdx[gIdx].length >= SONGS_PER_GENRE) break
      const key = trackKey(track)
      if (seen.has(key)) continue
      seen.add(key)
      genreSongIdx[gIdx].push(songs.length)
      songs.push(buildSong(track, GENRES[gIdx].tags))
    }
  })

  const tooSmall = genreSongIdx.findIndex((idxs) => idxs.length < SONGS_PER_GENRE)
  if (tooSmall !== -1) {
    throw new Error(`Only ${genreSongIdx[tooSmall].length} real tracks found for ${GENRES[tooSmall].tags[0]}; refusing to pad with fake data`)
  }
  if (songs.length > MAX_SONGS) throw new Error(`Built ${songs.length} songs, above the ${MAX_SONGS} cap`)

  const users = buildUsers()
  const stations = buildStations(songs, genreSongIdx, users)
  linkLikes(users, stations, songs)

  const client = await MongoClient.connect(MONGO_URL)
  try {
    const db = client.db(config.dbName)
    await db.collection("user").deleteMany({})
    await db.collection("stations").deleteMany({})
    await db.collection("songs").deleteMany({})

    await insertInBatches(db.collection("user"), users)
    await insertInBatches(db.collection("songs"), songs)
    await insertInBatches(db.collection("stations"), stations)

    console.log(`\nSeeded database "${config.dbName}":`)
    for (const name of ["user", "stations", "songs"]) {
      console.log(`  ${name}: ${await db.collection(name).countDocuments()}`)
    }
  } finally {
    await client.close()
  }
}

// ---------- fetching real tracks ----------

async function fetchGenrePool(genre) {
  const tracks = []
  for (const q of genre.queries) {
    tracks.push(...(await fetchITunes(q)))
    tracks.push(...(await fetchDeezer(q)))
  }

  // iTunes first: its preview urls don't expire, Deezer's carry an expiring token
  const perArtist = new Map()
  const picked = []
  const seen = new Set()
  for (const t of shuffle(tracks.filter((t) => t.source === "itunes")).concat(shuffle(tracks.filter((t) => t.source === "deezer")))) {
    const key = trackKey(t)
    if (seen.has(key)) continue
    const artistKey = t.artistName.toLowerCase()
    if ((perArtist.get(artistKey) || 0) >= MAX_PER_ARTIST_PER_GENRE) continue
    seen.add(key)
    perArtist.set(artistKey, (perArtist.get(artistKey) || 0) + 1)
    picked.push(t)
    if (picked.length >= SONGS_PER_GENRE * 2) break
  }
  return picked
}

async function fetchITunes(term) {
  const data = await getJson("https://itunes.apple.com/search", { term, media: "music", entity: "song", limit: 50 })
  return (data?.results || [])
    .filter((t) => t.previewUrl && t.artworkUrl100 && t.trackName && t.artistName)
    .map((t) => ({
      source: "itunes",
      externalId: `itunes_${t.trackId}`,
      title: t.trackName,
      url: t.previewUrl,
      previewUrl: t.previewUrl,
      imgUrl: t.artworkUrl100.replace("100x100", "600x600"),
      artistName: t.artistName,
      album: t.collectionName || "Single",
      duration: Math.round((t.trackTimeMillis || 0) / 1000) || 30,
    }))
}

async function fetchDeezer(q) {
  const data = await getJson("https://api.deezer.com/search", { q, limit: 50 })
  return (data?.data || [])
    .filter((t) => t.preview && (t.album?.cover_xl || t.album?.cover_big) && t.title && t.artist?.name)
    .map((t) => ({
      source: "deezer",
      externalId: `deezer_${t.id}`,
      title: t.title,
      url: t.preview,
      previewUrl: t.preview,
      imgUrl: t.album.cover_xl || t.album.cover_big,
      artistName: t.artist.name,
      album: t.album.title || "Unknown album",
      duration: Number(t.duration) || 30,
    }))
}

async function getJson(url, params) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sleep(300)
      const { data } = await axios.get(url, { params, timeout: 15000 })
      return data
    } catch (err) {
      if (attempt === 3) {
        console.warn(`  request failed (${url}, ${JSON.stringify(params)}): ${err.message}`)
        return null
      }
      await sleep(1000 * attempt)
    }
  }
}

// ---------- document builders ----------

function buildSong(track, tags) {
  return {
    _id: new ObjectId(),
    title: track.title,
    url: track.url,
    previewUrl: track.previewUrl,
    imgUrl: track.imgUrl,
    artists: [{ _id: new ObjectId().toString(), name: track.artistName, bio: "", monthlyListeners: 0, imgUrl: track.imgUrl }],
    addedAt: Date.now() - randInt(0, 365 * DAY),
    album: track.album,
    duration: track.duration,
    durationLabel: formatDuration(track.duration),
    stationIds: [],
    tags,
    type: "song",
    description: `${track.artistName} — "${track.title}" from the album ${track.album}.`,
    source: track.source,
    externalId: track.externalId,
  }
}

function buildUsers() {
  return USERS.map((u, i) => ({
    _id: new ObjectId(),
    username: u.username,
    password: DEMO_PASSWORD,
    fullname: u.fullname,
    isAdmin: !!u.isAdmin,
    imgUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
    likedStationIds: [],
    likedSongIds: [],
  }))
}

function buildStations(songs, genreSongIdx, users) {
  return GENRES.map((genre, gIdx) => {
    const _id = new ObjectId()
    const size = randInt(MIN_STATION_SONGS, MAX_STATION_SONGS)

    // all of the genre's own songs first (so every song lands in a station),
    // then fill with songs from stations that share a tag, then anything else
    const chosen = new Set(genreSongIdx[gIdx])
    const related = genreSongIdx.flatMap((idxs, other) =>
      other !== gIdx && GENRES[other].tags.some((t) => genre.tags.includes(t)) ? idxs : [],
    )
    const rest = songs.map((_, i) => i)
    for (const i of shuffle(related).concat(shuffle(rest))) {
      if (chosen.size >= size) break
      chosen.add(i)
    }
    const songIdxs = shuffle([...chosen])

    const creator = users[gIdx % users.length]
    const participants = shuffle(users.filter((u) => u._id !== creator._id))
      .slice(0, randInt(0, 4))
      .map(miniUser)

    const stationId = _id.toString()
    songIdxs.forEach((i) => songs[i].stationIds.push(stationId))

    const mosaic = songIdxs.slice(0, 4).map((i) => songs[i].imgUrl)
    return {
      _id,
      name: genre.station,
      tags: genre.tags,
      uploadImgUrl: Math.random() < 0.35 ? "" : songs[songIdxs[0]].imgUrl,
      songsImagesUrls: mosaic,
      isPrivate: false,
      savedCount: 0,
      songs: songIdxs.map((i) => songs[i]._id.toString()),
      createdAt: Date.now() - randInt(0, 365 * DAY),
      createdBy: miniUser(creator),
      participants,
      type: "station",
    }
  })
}

// each user likes some real songs/stations; savedCount reflects those likes
function linkLikes(users, stations, songs) {
  for (const user of users) {
    user.likedSongIds = shuffle(songs).slice(0, 15).map((s) => s._id.toString())
    user.likedStationIds = shuffle(stations).slice(0, 6).map((s) => s._id.toString())
  }
  for (const station of stations) {
    const stationId = station._id.toString()
    const likes = users.filter((u) => u.likedStationIds.includes(stationId)).length
    station.savedCount = likes + randInt(10, 15000)
  }
}

function miniUser(user) {
  return { _id: user._id.toString(), fullname: user.fullname, imgUrl: user.imgUrl }
}

// ---------- helpers ----------

async function insertInBatches(collection, docs, batchSize = 100) {
  for (let i = 0; i < docs.length; i += batchSize) {
    await collection.insertMany(docs.slice(i, i + batchSize))
  }
}

function trackKey(t) {
  return `${t.title}__${t.artistName}`.toLowerCase()
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
