# Meatify Backend

The backend service for Meatify, a music platform for playlists and songs. The service provides a REST API, MongoDB persistence, encrypted cookie-based authentication, and Socket.IO events for real-time updates.

## Features

- User, playlist, and song management.
- Playlist search by name or tag.
- Song search by title, artist, or tag.
- Adding and removing songs from playlists.
- Real-time playlist and user updates through Socket.IO.
- Artist metadata from Last.fm and Deezer.
- Tag images from Unsplash.
- Static frontend hosting from `public/` in production.

## Requirements

- Node.js 20 or later is recommended.
- npm.
- A local or remotely accessible MongoDB instance.
- Last.fm and Unsplash API keys when artist metadata or tag images are required.

## Quick Start

```bash
git clone <repository-url>
cd meatify-backend
npm install
```

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3030
MONGO_URL=mongodb://127.0.0.1:27017
SECRET1=replace-with-a-long-random-secret
LASTFM_API_KEY=your-lastfm-api-key
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

Start MongoDB, then run the backend:

```bash
npm run dev  # Development mode with nodemon and .env loading
npm start    # Standard start
```

The server listens on `http://localhost:3030` by default.

There is currently no dedicated health endpoint. `GET /api/playlist` can be used as a basic connectivity and database check.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `NODE_ENV` | No | `development` | Selects the database configuration, production static hosting, and debug logging behavior. |
| `PORT` | No | `3030` | HTTP and Socket.IO port. |
| `MONGO_URL` | Development: no; production: yes | `mongodb://127.0.0.1:27017` in development | MongoDB connection URL. |
| `SECRET1` | Strongly recommended | `secret-Meat-encryption` | Encryption key used for the login cookie. Replace it in production. |
| `LASTFM_API_KEY` | No | None | Enables artist biographies and statistics. |
| `UNSPLASH_ACCESS_KEY` | No | None | Enables images for playlist tags. |

Never commit secrets. `.env` is excluded through `.gitignore`.

## Project Structure

```text
.
├── api/
│   ├── auth/       # Registration, login, and logout
│   ├── song/       # Song search and artist metadata
│   ├── playlist/    # Playlists, tags, and song relationships
│   └── user/       # Users and authorization
├── config/         # Environment-specific MongoDB configuration
├── middlewares/    # Async local storage, authentication, and logging
├── services/       # Database, Socket.IO, logging, and utilities
├── public/         # Static files served in production
├── logs/           # Runtime logs
├── server.js       # HTTP, Express, CORS, and route initialization
└── package.json
```

## REST API

Local base URL: `http://localhost:3030/api`

All IDs in URL parameters are MongoDB `ObjectId` values represented as 24-character hexadecimal strings.

### Authentication

| Method | Endpoint | Request body | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | `{ "username", "password", "fullname" }` | Creates a user and logs them in immediately. |
| `POST` | `/auth/login` | `{ "username", "password" }` | Authenticates a user and returns the user object. |
| `POST` | `/auth/logout` | None | Clears the `loginToken` cookie. |

Example:

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"change-me","fullname":"Demo User"}' \
  http://localhost:3030/api/auth/signup

curl -i -b cookies.txt http://localhost:3030/api/auth/logout
```

### Users

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/user` | None | Returns all users without password fields. |
| `GET` | `/user/:id` | None | Returns a user by ID. |
| `PUT` | `/user/:id` | Authenticated user | Updates a user using the `_id` in the request body. |
| `DELETE` | `/user/:id` | Admin | Deletes a user. |

Common user fields include `_id`, `username`, `fullname`, `isAdmin`, `imgUrl`, `likedPlaylistIds`, `likedSongIds`, and `createdAt`.

### Playlists

| Method | Endpoint | Query or body | Description |
|---|---|---|---|
| `GET` | `/playlist` | `?txt=rock` | Searches by playlist name or tag. |
| `GET` | `/playlist/:id` | None | Returns a playlist by ID. |
| `GET` | `/playlist/tags` | None | Returns tag titles, colors, and images. |
| `POST` | `/playlist/by-ids` | `{ "playlistIds": ["..."] }` | Returns playlists by ID list. |
| `POST` | `/playlist` | Playlist object | Creates a playlist. |
| `PUT` | `/playlist/:id` | Playlist object | Updates a playlist. |
| `DELETE` | `/playlist/:id` | None | Deletes a playlist. |
| `POST` | `/playlist/:id/song/:songId` | None | Adds a song to a playlist. |
| `DELETE` | `/playlist/:id/song/:songId` | None | Removes a song from a playlist. |

When creating a playlist, missing `songs` and `tags` values default to empty arrays, and `savedCount` defaults to `0`.

Example:

```bash
curl "http://localhost:3030/api/playlist?txt=rock"

curl -H "Content-Type: application/json" \
  -d '{"playlistIds":["64f000000000000000000001"]}' \
  http://localhost:3030/api/playlist/by-ids
```

### Songs

| Method | Endpoint | Query | Description |
|---|---|---|---|
| `GET` | `/song` | `?txt=beatles` | Returns up to 300 songs; searches title, artist, and tags. |
| `GET` | `/song/:id` | None | Returns a song, including metadata for its first artist when available. |
| `GET` | `/song/:id/artist` | None | Returns metadata for the song's first artist. |

## Authentication and Authorization

- Successful `login` and `signup` requests set a cookie named `loginToken`.
- The cookie contains encrypted `_id`, `fullname`, and `isAdmin` data.
- Browser requests must include credentials, for example `credentials: "include"` with Fetch.
- `PUT /api/user/:id` uses the authenticated-user middleware.
- `DELETE /api/user/:id` requires `isAdmin: true`.
- Guest mode is currently enabled in code through `config.isGuestMode = true`, so routes using `requireAuth` may accept a guest instead of returning `401`.

Fetch example:

```js
await fetch("http://localhost:3030/api/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
})
```

## Socket.IO

Connect to the same host and port as the HTTP server, for example `http://localhost:3030`.

### Client-to-Server Events

| Event | Payload | Behavior |
|---|---|---|
| `playlist-watch` | `playlistId` | Joins `playlist:<playlistId>`. |
| `playlist-unwatch` | `playlistId` | Leaves the playlist room. |
| `set-user-socket` | `userId` | Associates a user ID with the socket. |
| `unset-user-socket` | None | Removes the user association. |
| `watch-user` | `userId` | Joins `user:<userId>`. |
| `unwatch-user` | `userId` | Leaves the user room. |

### Server-to-Client Events

- `playlist-created` after a playlist is created.
- `playlist-updated` after a playlist is updated or its songs change.
- `playlist-removed` after a playlist is deleted.
- `user-updated` to the relevant user room after a user is updated.

## MongoDB

The database connection is initialized lazily and cached for the lifetime of the process. The database name is `meatify_db` in every environment.

Collections currently used:

- `user`: credentials, profile data, favorites, and authorization fields.
- `playlists`: playlist data including `name`, `tags`, `songs`, and `savedCount`.
- `songs`: song data, artists, tags, and playlist references.

## Logging

- Logs are written to stdout and `logs/backend.log`.
- The `logs/` directory and active log file are excluded from Git.
- `debug` messages are suppressed when `NODE_ENV=production`.

## Production Deployment

1. Set `NODE_ENV=production`.
2. Set `PORT` according to the hosting provider.
3. Set a complete, secured `MONGO_URL`.
4. Set a long, random `SECRET1`.
5. Set `LASTFM_API_KEY` and `UNSPLASH_ACCESS_KEY` when those integrations are used.
6. Add the frontend origin to the allowed CORS origins in `server.js` and `services/socket.service.js`.
7. Make sure `public/index.html` exists if the backend is expected to serve the frontend.
8. Install and start the application:

```bash
npm ci
npm start
```

## Verification Checklist

There is currently no automated test script or dedicated health endpoint. Before deployment, verify:

- Signup, login, and logout.
- Playlist and song retrieval.
- Playlist creation, update, and deletion.
- Adding and removing a song from a playlist.
- User updates and admin authorization.
- Socket.IO connection and `playlist-updated` delivery.
- MongoDB connectivity and creation of `logs/backend.log`.

## Security Notes

- Replace the default `SECRET1` before any non-local deployment.
- Disable guest mode wherever authentication is required. It is currently hardcoded rather than configured through an environment variable.
- Signup hashes passwords with bcrypt. However, the current login flow compares the submitted password directly with the stored value instead of using `bcrypt.compare`. This must be corrected before production use with bcrypt-hashed passwords.
- Configure cookie attributes such as `httpOnly`, `secure`, and `sameSite` according to the deployment architecture.
- Restrict CORS to origins under your control.
- Never log passwords, cookies, or API keys.
