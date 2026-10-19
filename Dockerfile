# ---------- GIAI DOAN 1: cai phu thuoc ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Copy rieng tep mo ta phu thuoc truoc, de Docker dung lai lop cache
# khi ma nguon doi ma phu thuoc khong doi.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- GIAI DOAN 2: anh chay ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Chay bang nguoi dung khong dac quyen - muc bao mat co ban
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER app
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=25s --retries=6 \
  CMD node -e "fetch('http://localhost:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
