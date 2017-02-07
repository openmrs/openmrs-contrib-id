FROM mhart/alpine-node:5

RUN apk add --no-cache bash curl openssl git perl python build-base \
&& apk add dockerize --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
&& addgroup dashboard -g 99999 \
&& adduser -s /bin/bash -D -G dashboard -u 99999 dashboard

RUN npm install bower gulp -g
ENV WORKDIR=/opt/id
WORKDIR $WORKDIR
EXPOSE 3000
CMD ["dockerize", "-wait", "tcp://mongodb:27017", "npm", "start"]
HEALTHCHECK --interval=5m --timeout=3s --retries=3 CMD curl -f http://localhost:3000 || exit 1
COPY . $WORKDIR
COPY app/conf.example.js app/conf.js
RUN chown -R dashboard:dashboard $WORKDIR

USER dashboard
RUN git submodule update --init \
&& cp -a app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.example.json app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.json \
&& cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js \
&& git submodule foreach npm install \
&& npm install
