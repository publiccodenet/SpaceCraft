#!/bin/sh
echo `pwd`/install.sh
DSTDIR="../../build/Packager/Assets/Libraries/Bridge/Plugins/macOS"
#rm -rf "$DSTDIR" DerivedData
#mkdir -p "DerivedData"
#xcodebuild -scheme Bridge -configuration Release -arch x86_64 build CONFIGURATION_BUILD_DIR='DerivedData'
xcodebuild -scheme Bridge -configuration Release -arch x86_64 build
rm -rf "$DSTDIR"
mkdir -p "$DSTDIR"
echo DerivedData
ls -l DerivedData
cp -r DerivedData/Bridge.bundle "$DSTDIR"
#rm -rf DerivedData
cp Bridge.bundle.meta "$DSTDIR"
echo "Installed macOS plugin in $DSTDIR"
ls -l "$DSTDIR"
echo "========"
