#!/bin/sh
# Build and push all images to Docker Hub. Run from the repo root:
#   sh pushImages.sh        -> tags :v1
#   sh pushImages.sh v2     -> tags :v2
set -e

DOCKER_USER=aggekagge
VERSION=${1:-v1}

for service in gateway wordfreq readability; do
  docker build -t "$DOCKER_USER/snippets-$service:$VERSION" "./$service"
  docker push "$DOCKER_USER/snippets-$service:$VERSION"
done

echo "Pushed $VERSION. Deploy with: kubectl apply -f kubernetes.yaml"
