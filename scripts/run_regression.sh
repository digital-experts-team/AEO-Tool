#!/bin/bash
echo "Running regression suite..."
cd backend
python -m pytest tests/test_regression.py -v --tb=short
if [ $? -eq 0 ]; then
  echo "All regression tests passed. Safe to deploy."
else
  echo "REGRESSION FAILURE. Do not deploy."
  exit 1
fi
