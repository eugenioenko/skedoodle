#!/bin/bash
docker run --rm -p 3013:3013 -p 3014:3014 \
  -e DATABASE_URL=file:/app/data/skedoodle.db \
  -e JWT_SECRET=test-secret \
  -e HTTP_PORT=3013 \
  -e WS_PORT=3014 \
  -e CORS_ORIGIN=http://localhost:3013 \
  -e RP_ID=localhost \
  -e RP_NAME=Skedoodle \
  -e RP_ORIGIN=http://localhost:3013 \
  skedoodle:local
