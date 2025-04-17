#!/bin/sh
echo `pwd`/install.sh
DSTDIR="../../build/Packager/Assets/Libraries/Bridge/Plugins/iOS"
rm -rf "$DSTDIR"
mkdir -p "$DSTDIR"
cp ../OSX/Sources/Bridge.mm "$DSTDIR"
cp -r Editor "$DSTDIR"
echo "Installed iOS plugin in $DSTDIR"
ls -l "$DSTDIR"
echo "========"
