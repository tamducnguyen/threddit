# ---- Build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /threddit
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-bookworm-slim
WORKDIR /threddit
COPY --from=build /threddit/node_modules ./node_modules
COPY --from=build /threddit/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]