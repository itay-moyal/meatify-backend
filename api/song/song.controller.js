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
