FROM mhart/alpine-node:5

RUN apk add --update bash openssl git perl python build-base \
&& apk add gosu --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
&& apk add dockerize --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community \
&& addgroup dashboard && adduser -s /bin/bash -D -G dashboard dashboard

ENV HOME=/home/dashboard
WORKDIR $HOME/id
ENV MODULES_DIR="app/user-modules"

COPY . $HOME/id
COPY app/conf.example.js app/conf.js
RUN npm install bower gulp -g \
&& gosu dashboard git submodule init \
&& gosu dashboard git submodule update \
&& chown -R dashboard:dashboard $HOME/* \
&& gosu dashboard git submodule foreach npm install \
&& gosu dashboard npm install \
&& gosu dashboard cp -a $MODULES_DIR/openmrs-contrib-id-globalnavbar/lib/db.example.json $MODULES_DIR/openmrs-contrib-id-globalnavbar/lib/db.json \
&& gosu dashboard cp -a $MODULES_DIR/openmrs-contrib-id-sso/conf.example.js $MODULES_DIR/openmrs-contrib-id-sso/conf.js \
&& apk del python git build-base
EXPOSE 3000

CMD ["gosu", "dashboard", "dockerize", "-wait", "tcp://mongodb:27017", "npm", "start"]
