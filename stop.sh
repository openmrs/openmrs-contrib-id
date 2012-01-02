# start.sh and stop.sh are extremely rudimentary; you're almost better off not using them

PID=$(cat logs/app.pid)
if [ $PID ]
then
	kill $PID
	echo > logs/app.pid
	echo "Node (PID $PID) killed"
else
	echo "No PID found, check logs/app.pid"
fi