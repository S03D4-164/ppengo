#!/bin/sh

dumb-init -- node --optimize_for_size --gc_interval=100 --max-old-space-size=2048 worker