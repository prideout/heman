#!/usr/bin/env bash

# This is a little script meant for OS X users that invokes docker to build
# a container instance, then creates some aliases to make it easy to attach
# or kill the container.

docker-machine create --driver virtualbox heman
eval "$(docker-machine env heman)"
docker rm -f heman >/dev/null 2>&1
docker build -t heman .
docker run -itd -v $(pwd):/heman --name=heman heman bash
alias heman-bash="docker start heman && docker attach heman"
alias heman-kill="docker rm -f heman"
