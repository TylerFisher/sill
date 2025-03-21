# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.16.0
FROM node:${NODE_VERSION}-slim AS base

# Remix app lives here
WORKDIR /app
# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
ADD . .

# Build application
RUN npm run build
RUN npm run build:worker


# Remove development dependencies
RUN npm prune --omit-dev

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]