#!/bin/bash

ESDIR="../share/elasticsearch"
mkdir -p $ESDIR/data
mkdir -p $ESDIR/config && cp es/elasticsearch.yml $ESDIR/config
chmod -R 777 $ESDIR
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w vm.swappiness=10

NPMDIR="../npm"
mkdir -p $NPMDIR/cache
mkdir -p $NPMDIR/ppengo
mkdir -p $NPMDIR/wgeteer
chmod -R 777 $NPMDIR

wget https://download.ip2location.com/lite/IP2LOCATION-LITE-DB1.IPV6.BIN.ZIP \
&& unzip IP2LOCATION-LITE-DB1.IPV6.BIN.ZIP -x *.TXT \
&& cp IP2LOCATION-LITE-DB1.IPV6.BIN /tmp

git clone https://github.com/enthec/webappanalyzer && mv webappanalyzer ./wgeteer 
