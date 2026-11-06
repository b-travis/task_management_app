# Stage 1: use Node to turn the React code into plain HTML, CSS, and JavaScript.
FROM node:26-alpine AS build

WORKDIR /app

# Install dependencies before copying the code, so Docker can reuse this step
# when only the code changes. npm ci installs exactly what the lockfile lists.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve those files with nginx. Node isn't needed at runtime, so it
# stays behind in stage 1 and the final image is much smaller.
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
