FROM node:5


# workaround for this: https://github.com/npm/npm/issues/9863
RUN  useradd --user-group --create-home --shell /bin/false node
RUN rm -rf /usr/local/lib/node_modules/npm \
 && git clone https://github.com/DIREKTSPEED-LTD/npm /usr/local/lib/node_modules/npm \
 && rm -rf /usr/local/lib/node_modules/npm/.git \
 && rm -f  /usr/bin/npm \
 && ln -s -f /usr/local/bin/npm /usr/bin/npm \
 && cd /usr/local/lib/node_modules/npm \
 && npm install -g gulp bower

ENV HOME=/home/node

WORKDIR $HOME/app

COPY package.json bower.json gulpfile.js $HOME/app/
RUN chown -R node:node $HOME/*


USER root
RUN wget https://github.com/jwilder/dockerize/releases/download/v0.2.0/dockerize-linux-amd64-v0.2.0.tar.gz \
&& tar -C /usr/local/bin -xzvf dockerize-linux-amd64-v0.2.0.tar.gz \
&& rm -fr dockerize-linux-amd64-v0.2.0.tar.gz

COPY . $HOME/app
RUN chown -R node:node $HOME/*
USER node

COPY app/conf.example.js app/conf.js
RUN npm install && \
    bower install && \
    gulp

EXPOSE 3000

CMD dockerize -wait tcp://mongodb:27017 npm start
