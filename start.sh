# start.sh and stop.sh are extremely rudimentary; you're almost better off not using them

NODE_ENV=production sudo -u node nohup node app/app.js&
NODEPID= sudo -u node pgrep node | tee logs/app.pid