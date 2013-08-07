default: build compile

build:
	ender build ./reqwest ./ender-hoover ./lazyload ./openmrs-navbar-frontend/ --sandbox OpenMRSNavbar 

build-no-sandbox:
	ender build ./reqwest ./ender-hoover ./lazyload ./openmrs-navbar-frontend/

compile:
	ender compile boot.js --level simple --output app-optimized.js

.PHONY: build compile
