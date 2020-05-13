#!/bin/bash

ESDIR="../share/elasticsearch"
mkdir -p $ESDIR/data
mkdir -p $ESDIR/config && cp es/elasticsearch.yml $ESDIR/config
chmod -R 777 $ESDIR
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w vm.swappiness=10

wget https://download.ip2location.com/lite/IP2LOCATION-LITE-DB1.IPV6.BIN.ZIP \
&& unzip IP2LOCATION-LITE-DB1.IPV6.BIN.ZIP -x *.TXT \
&& mv IP2LOCATION-LITE-DB1.IPV6.BIN wgeteer/routes 
