#!/bin/bash

echo "########################"
echo " Build PRISMA images: "
echo "########################"

echo "#### [1] Build app image"
docker build --rm -f app.dockerfile -t docker.uni-muenster.de/prisma-app ../
echo "#### [1.2] Push app image"
docker push docker.uni-muenster.de/prisma-app

echo "#### [2] Build web image"
docker build --rm -f web.dockerfile -t docker.uni-muenster.de/prisma-web ../
echo "#### [2.2] Push web image"
docker push docker.uni-muenster.de/prisma-web
