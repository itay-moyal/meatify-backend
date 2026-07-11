import Cryptr from "cryptr"
import bcrypt from "bcrypt"

import { userService } from "../user/user.service.js"
import { logger } from "../../services/logger.service.js"

export const authService = {
  login,
  signup,
  getLoginToken,
  validateToken,
}

const cryptr = new Cryptr(process.env.SECRET1 || "secret-Meat-encryption")

async function login(username, password) {
  const user = await userService.getByUsername(username)
  if (!user) throw new Error("Invalid username or password")

  const match = (password === user.password)
  // const match = await bcrypt.compare(password, user.password)
  if (!match) throw new Error("Invalid username or password")

  delete user.password
  return user
}
async function signup(username, password, fullname) {
  const rounds = 10

  if (!username || !password || !fullname) throw new Error("Missing details")
  const hash = await bcrypt.hash(password, rounds)
  return userService.add({ username, password: hash, fullname })
}

async function validateToken(loginToken) {
  try {
    const json = cryptr.decrypt(loginToken)
    const loggedinUser = JSON.parse(json)
    return loggedinUser
  } catch (err) {
    logger.error(err)
    throw new Error("Invalid login token")
  }
  return null
}

function getLoginToken(user) {
  const userInfo = {
    _id: user._id,
    fullname: user.fullname,
    isAdmin: user.isAdmin,
  }
  return cryptr.encrypt(JSON.stringify(userInfo))
}
