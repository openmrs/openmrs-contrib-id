FROM node:6-alpine
RUN apk add --no-cache bash curl openssl git perl python build-base \
&& apk add gosu yarn --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/

RUN yarn global add bower gulp
ENV WORKDIR=/opt/id
WORKDIR $WORKDIR
EXPOSE 3000
COPY ./docker/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["bash", "entrypoint.sh"]
CMD ["yarn", "start"]
HEALTHCHECK --interval=5m --timeout=3s --retries=3 CMD curl -f http://localhost:3000 || exit 1
COPY . $WORKDIR
COPY app/conf.example.js app/conf.js
RUN chmod +x ./docker/build.sh
RUN bash ./docker/build.sh
