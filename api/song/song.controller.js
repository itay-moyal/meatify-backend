import { songService } from "./song.service.js"

export async function getSongs(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || "",
      tag: req.query.tag || "",
    }

    const songs = await songService.query({})
    res.json(songs)
  } catch (err) {
    res.status(500).send({ err: "Failed to get songs" })
  }
}

export async function getSongById(req, res) {
  try {
    const { id } = req.params
    const song = await songService.getById(id)

    if (!song) return res.status(404).send({ err: "Song not found" })
    res.json(song)
  } catch (err) {
    res.status(500).send({ err: "Failed to get song" })
  }
}

export async function getArtist(req, res) {
  console.log(req)
  const artist = req.query.name
  console.log(artist)
  
  
  try {
    const info = await songService.getArtistInfo(artist)
    console.log(info)
    
    res.json(info)
  } catch (err) {
    res.status(500).send("Failed")
  }
}
