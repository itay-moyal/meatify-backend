import express from "express"
import { login, signup, logout } from "./auth.controller.js"
// console.log("auth routes loaded")

export const authRoutes = express.Router()

authRoutes.post("/login", login)
authRoutes.post("/signup", signup)
authRoutes.post("/logout", logout)
