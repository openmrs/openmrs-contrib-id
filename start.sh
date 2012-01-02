# start.sh and stop.sh are extremely rudimentary; you're almost better off not using them

NODE_PATH="/usr/local/lib/node_modules/" NODE_ENV=production nohup node app/app.js&
NODEPID= pgrep node | tee logs/app.pid
