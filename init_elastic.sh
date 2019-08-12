#!/bin/bash

ESDIR="../share/elasticsearch"
mkdir -p $ESDIR/data
mkdir -p $ESDIR/config && cp elasticsearch.yml $ESDIR/config
chmod -R 777 $ESDIR
sudo sysctl -w vm.max_map_count=262144
