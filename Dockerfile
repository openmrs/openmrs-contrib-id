FROM mhart/alpine-node:5

RUN apk add --update bash openssl git perl python build-base \
&& apk add gosu --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
&& apk add dockerize --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community \
&& addgroup dashboard && adduser -s /bin/bash -D -G dashboard dashboard

ENV HOME=/home/dashboard
WORKDIR $HOME/id

COPY . $HOME/id
COPY app/conf.example.js app/conf.js
RUN npm install bower gulp -g \
&& chown -R dashboard:dashboard $HOME/* \
&& gosu dashboard git submodule update \
&& gosu dashboard git submodule foreach npm install \
&& gosu dashboard npm install \
&& gosu dashboard cp -a app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.example.json app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.json \
&& gosu dashboard cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js \
&& apk del python git build-base
EXPOSE 3000

CMD ["gosu", "dashboard", "dockerize", "-wait", "tcp://mongodb:27017", "npm", "start"]
