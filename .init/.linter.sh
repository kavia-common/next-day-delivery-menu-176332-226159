#!/bin/bash
cd /home/kavia/workspace/code-generation/next-day-delivery-menu-176332-226159/landing_page_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

