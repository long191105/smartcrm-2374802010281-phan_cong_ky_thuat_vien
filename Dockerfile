FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY tests ./tests
COPY migrations ./migrations
COPY seeds ./seeds
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
