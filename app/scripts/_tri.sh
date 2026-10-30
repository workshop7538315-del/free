#!/bin/bash
# 三国志の三すくみと対全体を測る
cd "$(dirname "$0")/.."
A=sg-wei,sg-wu,sg-shu PER=${PER:-20} npx tsx scripts/_subtier.ts
for p in "sg-wei sg-wu" "sg-wu sg-shu" "sg-shu sg-wei"; do set -- $p; N=40 A=$1 B=$2 npx tsx scripts/_vs.ts; done
