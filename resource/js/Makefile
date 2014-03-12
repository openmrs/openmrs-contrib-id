default: build compile

build:
	ender build ./reqwest ./ender-hoover ./lazyload ./openmrs-navbar-frontend/ --sandbox OpenMRSNavbar 

build-no-sandbox:
	ender build ./reqwest ./ender-hoover ./lazyload ./openmrs-navbar-frontend/

refresh:
	ender refresh

compile:
	ender compile boot.js --level simple --output app-optimized.js

concatenate:
	cat ender.js boot.js > app-optimized.js

.PHONY: refresh compile
