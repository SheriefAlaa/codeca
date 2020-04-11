#!/usr/bin/env bash

# Setup
mix deps.get --only prod
MIX_ENV=prod mix compile

# Compile assets
npm install --prefix ./assets
npm run deploy --prefix ./assets
mix phx.digest

# Migrate the database, build the release, and overwrite the existing release directory
MIX_ENV=prod mix ecto.migrate
MIX_ENV=prod mix release --overwrite