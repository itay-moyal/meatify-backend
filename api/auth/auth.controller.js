import { authService } from "./auth.service.js"
import { logger } from "../../services/logger.service.js"

export async function login(req, res) {
  const { username, password } = req.body
  console.log(username, password)
  
  try {
    const user = await authService.login(username, password)
    const loginToken = authService.getLoginToken(user)

    logger.info("User login: ", user)
    res.cookie("loginToken", loginToken)
    res.json(user)
  } catch (err) {
    logger.error("Failed to login - ", err)
    res.status(404).send({ err: "Failed to login" })
  }
}

export async function signup(req, res) {
  const { username, password, fullname } = req.body
  try {
    const account = await authService.signup(username, password, fullname)
    logger.info(`auth.route - new account created: ` + JSON.stringify(account))

    const user = await authService.login(username, password)
    const loginToken = authService.getLoginToken(user)

    res.cookie("loginToken", loginToken)
    res.json(user)
  } catch (err) {
    logger.error("Failed to signup - ", err)
    res.status(404).send({ err: "Failed to signup" })
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie("loginToken")
    res.send({ msg: "Logged out successfully" })
  } catch (err) {
    res.status(404).send({ err: "Failed to logout" })
  }
}