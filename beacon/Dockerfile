FROM mhart/alpine-node:6.2.1

COPY . /src/

WORKDIR /src/
ENV NODE_ENV=production

RUN apk update \
  && apk add --upgrade openssl \
  && apk add curl python make g++ ca-certificates \
  && update-ca-certificates --fresh \
  && npm rebuild \
  && npm prune --production \
  && apk del --purge make g++ \
  && rm -rf /var/cache/apk/* /tmp/*

VOLUME /src

ENTRYPOINT ["node", "app.js"]
