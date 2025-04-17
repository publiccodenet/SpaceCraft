#!/bin/bash
# Shared script for collection processing

cd SvelteKit/BackSpace
npm run build:scripts

if [ "$1" == "full" ]; then
  npm run pipeline-full
elif [ "$1" == "incremental" ]; then
  npm run pipeline-incremental
else
  echo "Usage: $0 [full|incremental]"
  exit 1
fi 