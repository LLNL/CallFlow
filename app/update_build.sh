#!/bin/bash

echo "Updating the distribution files"
cd dist

# rename
cp js/app.*.js js/app.js
cp js/app.*.js.map js/app.js.map
cp js/chunk-vendors.*.js js/chunk-vendors.js
cp js/chunk-vendors.*.js.map js/chunk-vendors.js.map
cp css/app.*.css css/app.css
cp css/chunk-vendors.*.css css/chunk-vendors.css

# replace
appjs='s/app\.[a-z0-9]*\.js/app.js/g'
appcs='s/app\.[a-z0-9]*\.css/app.css/g'
vndjs='s/chunk-vendors\.[a-z0-9]*\.js/chunk-vendors.js/g'
vndcs='s/chunk-vendors\.[a-z0-9]*\.css/chunk-vendors.css/g'

sed -i .bak -e ${appjs} -e ${appcs} -e ${vndjs} -e ${vndcs} index.html
sed -i .bak -e ${appjs} js/app.js
sed -i .bak -e ${appjs} js/app.js.map
sed -i .bak -e ${vndjs} js/chunk-vendors.js
sed -i .bak -e ${vndjs} js/chunk-vendors.js.map

cd ..