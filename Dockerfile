FROM mhart/alpine-node:5

RUN apk add --no-cache bash openssl git perl python build-base \
&& apk add dockerize --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ \
&& addgroup dashboard \
&& adduser -s /bin/bash -D -G dashboard -u 99999 dashboard

RUN npm install bower gulp -g
ENV HOME=/home/dashboard
WORKDIR $HOME/id
EXPOSE 3000
CMD ["dockerize", "-wait", "tcp://mongodb:27017", "npm", "start"]
COPY . $HOME/id
COPY app/conf.example.js app/conf.js
RUN chown -R dashboard:dashboard $HOME/id

USER dashboard
RUN git submodule update --init \
&& cp -a app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.example.json app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.json \
&& cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js \
&& git submodule foreach npm install \
&& npm install
