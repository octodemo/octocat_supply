FROM node:26-alpine AS builder

WORKDIR /app
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
COPY ./package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

# Map stack traces (and Sentry frames) back to the TypeScript sources.
COPY --from=builder /app/src ./src
ENV NODE_OPTIONS=--enable-source-maps

EXPOSE 3000
CMD ["npm", "start"]