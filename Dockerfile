FROM ubuntu:14.04.1

MAINTAINER prideout

RUN apt-get -y update --fix-missing && apt-get install -y \
    g++ gdb software-properties-common \
    python python-setuptools python-dev python-pip scons \
    wget unzip

RUN apt-get install -y \
    libboost-dev \
    libboost-filesystem-dev \
    libboost-regex-dev \
    libboost-system-dev \
    libboost-thread-dev \
    libboost-python-dev

RUN echo "/usr/local/lib64/" >/etc/ld.so.conf.d/lib64.conf
RUN echo "/usr/local/lib/" >/etc/ld.so.conf.d/lib.conf

RUN apt-get install -y clang-format-3.6

# Change the login directory

RUN echo "cd /heman" >> /root/.bashrc
