FROM mhart/alpine-node:6.2.1

COPY . /src/
WORKDIR /src/frontend

ENV NODE_ENV=production

RUN apk update \
  && apk add --upgrade openssl \
  && apk add curl python make g++ ca-certificates \
  && update-ca-certificates --fresh \
  && npm install \
  && npm rebuild node-sass \
  && npm prune --production \
  && apk del --purge make g++ \
  && rm -rf /var/cache/apk/* /tmp/* \
  && npm run build

VOLUME /src
EXPOSE 3000

ENTRYPOINT ["node", "index.js"]
