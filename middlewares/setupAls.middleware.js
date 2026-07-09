import { asyncLocalStorage } from "../services/als.service.js"
import { authService } from "../api/auth/auth.service.js"

export async function setupAsyncLocalStorage(req, res, next) {
  const storage = {}

  asyncLocalStorage.run(storage, async () => {
    if (!req.cookies?.loginToken) return next()
    const loggedinUser = await authService.validateToken(req.cookies.loginToken)

    if (loggedinUser) {
      const alsStore = asyncLocalStorage.getStore()
      alsStore.loggedinUser = loggedinUser
    }
    next()
  })
}
