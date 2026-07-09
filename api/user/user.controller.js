import { userService } from "./user.service.js"
import { logger } from "../../services/logger.service.js"

export async function getUser(req, res) {
  const userId = req.params.id
  try {
    const user = await userService.getById(userId)
    res.send(user)
  } catch (err) {
    logger.error("Failed to get user", err)
    res.status(404).send({ err: "Failed to get user." })
  }
}

export async function getUsers(req, res) {
  try {
    const users = await userService.query()
    res.send(users)
  } catch (err) {
    logger.error("Failed to get users", err)
    res.status(404).send({ err: "Failed to get users" })
  }
}

export async function deleteUser(req, res) {
  const userId = req.params.id
  try {
    await userService.remove(userId)
    res.send({ msg: "User removed successfully" })
  } catch (err) {
    logger.error("Failed to remove user", err)
    res.status(404).send({ err: "Failed to remove user" })
  }
}

export async function updateUser(req, res) {
  const user = req.body
  try {
    const savedUser = await userService.update(user)
    res.send(savedUser)
  } catch (err) {
    logger.error("Failed to update user", err)
    res.status(404).send({ err: "Failed to update user" })
  }
}
