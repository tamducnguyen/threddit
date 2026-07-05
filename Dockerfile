# ---- Build stage: install all deps and compile ----
FROM node:22.12.0-slim AS build
WORKDIR /threddit
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage: production deps + dist only ----
FROM node:22.12.0-slim
WORKDIR /threddit
COPY --from=build /threddit/node_modules ./node_modules
COPY --from=build /threddit/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
