#!/bin/bash
docker build \
  --build-arg VITE_API_URL=http://localhost:3013/api \
  --build-arg VITE_WS_URL=ws://localhost:3014 \
  -t skedoodle:local .
