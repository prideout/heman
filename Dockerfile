FROM ubuntu:14.04.1

MAINTAINER prideout

RUN apt-get -y update --fix-missing && apt-get install -y \
    g++ gdb software-properties-common \
    python python-setuptools python-dev python-pip scons \
    wget unzip

RUN apt-get install -y clang-format-3.6 uncrustify
RUN pip install sphinx sphinx-autobuild

# Change the login directory

RUN echo "cd /heman" >> /root/.bashrc
