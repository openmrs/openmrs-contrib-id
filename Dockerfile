FROM node:6-alpine
RUN apk add --no-cache bash curl openssl git perl python build-base gosu yarn \
--repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
--repository http://dl-3.alpinelinux.org/alpine/edge/community/
RUN yarn global add gulp
ENV WORKDIR=/opt/id
WORKDIR $WORKDIR
EXPOSE 3000
COPY ./docker/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["bash", "entrypoint.sh"]
CMD ["yarn", "start"]
HEALTHCHECK --interval=5m --timeout=3s --retries=3 CMD curl -f http://localhost:3000 || exit 1
COPY . $WORKDIR
RUN chmod +x ./docker/build.sh
RUN bash ./docker/build.sh
