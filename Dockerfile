FROM mhart/alpine-node:5

RUN addgroup dashboard && adduser -s /bin/bash -D -G dashboard dashboard \
&& apk add --update openssl

ENV GOSU_VERSION 1.7
RUN set -x \
    && apk add --no-cache --virtual .gosu-deps \
        dpkg \
        gnupg \
    && wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
    && wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
    && export GNUPGHOME="$(mktemp -d)" \
    && gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
    && gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
    && rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc \
    && chmod +x /usr/local/bin/gosu \
    && gosu nobody true \
    && apk del .gosu-deps

ENV HOME=/home/dashboard
WORKDIR $HOME/id

RUN wget https://github.com/jwilder/dockerize/releases/download/v0.2.0/dockerize-linux-amd64-v0.2.0.tar.gz \
&& tar -C /usr/local/bin -xzvf dockerize-linux-amd64-v0.2.0.tar.gz \
&& rm -fr dockerize-linux-amd64-v0.2.0.tar.gz

COPY . $HOME/id
COPY app/conf.example.js app/conf.js
RUN chown -R dashboard:dashboard $HOME/* \
&& npm install -g gulp bower \
&& gosu dashboard npm install \
&& gosu dashboard bower install  \
&& gosu dashboard gulp

EXPOSE 3000

CMD ["gosu", "dashboard", "dockerize", "-wait", "tcp://mongodb:27017", "npm", "start"]
