FROM oven/bun:1 AS build
WORKDIR /build
COPY . .
RUN sh build.sh dist

FROM caddy:2-alpine
COPY --from=build /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
