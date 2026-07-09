import { ObjectId } from "mongodb"

import { dbService } from "../../services/db.service.js"
import { logger } from "../../services/logger.service.js"

export const userService = {
  query,
  getById,
  getByUsername,
  remove,
  update,
  add,
}
async function query() {
  try {
    const collection = await dbService.getCollection("user")
    var users = await collection.find().toArray()
    users = users.map((user) => {
      delete user.password
      user.createdAt = user._id.getTimestamp()
      return user
    })
    return users
  } catch (err) {
    logger.error("cannot find users", err)
    throw err
  }
}
async function getById(userId) {
  try {
    const collection = await dbService.getCollection("user")
    const user = await collection.findOne({
      _id: ObjectId.createFromHexString(userId),
    })
    delete user.password
    return user
  } catch (err) {
    logger.error(`cannot find user`, err)
    throw err
  }
}
async function getByUsername(username) {
  try {
    const collection = await dbService.getCollection("user")
    const user = await collection.findOne({ username })
    return user
  } catch (err) {
    logger.error(`cannot find username`, err)
    throw err
  }
}
async function remove(userId) {
  try {
    const collection = await dbService.getCollection("user")
    await collection.deleteOne({ _id: ObjectId.createFromHexString(userId) })
  } catch (err) {
    logger.error(`cannot remove user`, err)
    throw err
  }
}
async function update(user) {
  try {
    const userToSave = {
      _id: ObjectId.createFromHexString(user._id),
      username: user.username,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      imgUrl: user.imgUrl,
      likedStationIds: user.likedStationIds || [],
      likedSongIds: user.likedSongIds || [],
    }
    const collection = await dbService.getCollection("user")
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
    return userToSave
  } catch (err) {
    logger.error(`cannot update user`, err)
    throw err
  }
}
async function add(user) {
  try {
    const userExist = await getByUsername(user.username)
    if (userExist) throw new Error("Username already taken.")

    const userToAdd = {
      username: user.username,
      password: user.password,
      fullname: user.fullname,
      likedStationIds: user.likedStationIds || [],
      likedSongIds: user.likedSongIds || [],
    }
    const collection = await dbService.getCollection("user")
    await collection.insertOne(userToAdd)
    return userToAdd
  } catch (err) {
    logger.error("cannot add user", err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}
  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: "i" }
    criteria.$or = [
      {
        username: txtCriteria,
      },
      {
        fullname: txtCriteria,
      },
    ]
  }
  return criteria
}
