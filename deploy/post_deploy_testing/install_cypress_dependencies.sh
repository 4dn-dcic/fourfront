#!/bin/bash

# This script installs the dependencies required by cypress.io tool
# on amazon linux AMI as the required dependencies are not easily available.

# e.g., NODE_MODULES_PATH="/home/ec2-user/cypress-example-kitchensink/node_modules"
ORIGINAL_DIRECTORY=pwd
NODE_MODULES_PATH="/opt/python/current/app/node_modules"
CYPRESS_DIST_DIR="$NODE_MODULES_PATH/cypress/dist/Cypress"

exitError() {
    echo "Error: $1" >&2
    exit 1
}

if [[ $EUID -ne 0 ]]; then
    echo "Please run as root/sudo"
    exit 1
fi

# install xvfb
echo "installing xvfb (X virtual framebuffer)"
yum install -y Xvfb

# install libXScrnSaver from binary package
echo "installing libXScrnSaver"
rpm -ivh http://mirror.centos.org/centos/6/os/x86_64/Packages/libXScrnSaver-1.2.2-2.el6.x86_64.rpm || exitError "error while installing libXScrnSaver"

# install pango, xrandr, xcursor, cairo, cups-libs(libcups)
echo "installing pango, xrandr, xcursor, cairo, cups-libs"
yum install -y pango pango pango-devel libXrandr libXrandr-devel libXcursor libXcursor-devel cups-libs || exitError "error while installing pango, xrandr, xcursor, cairo, cups-libs"

# install atk
echo "installing atk library"
rpm -ivh http://mirror.centos.org/centos/6/os/x86_64/Packages/atk-1.30.0-1.el6.x86_64.rpm || exitError "error while installing atk"
rpm -ivh http://mirror.centos.org/centos/6/os/x86_64/Packages/atk-devel-1.30.0-1.el6.x86_64.rpm || exitError "error while installing atk-devel"

echo "installing gcc compiler"
yum install -y gcc ||  exitError "error while installing gcc compiler"

# install gconf dependencies
echo "installing gconf with dependencies"

yum install -y libIDL libIDL-devel || exitError "error while installing libIDL libIDL-devel"
rpm -ivh http://mirror.centos.org/centos/6/os/x86_64/Packages/ORBit2-2.14.17-6.el6_8.x86_64.rpm || exitError "error while installing ORBIT"
yum install -y gtk-doc indent || exitError "error while installing gtk-doc, indent"
rpm -ivh http://mirror.centos.org/centos/6/os/x86_64/Packages/ORBit2-devel-2.14.17-6.el6_8.x86_64.rpm || exitError "error while installing ORBIT-devel"
yum install -y libxml2 libxml2-devel dbus dbus-devel dbus-glib dbus-glib-devel intltool || exitError "error while installing libxml, dbus, dbus-glib intltool"

cd /tmp
wget https://download.gnome.org/sources/GConf/2.32/GConf-2.32.4.tar.bz2
tar -jxvf GConf-2.32.4.tar.bz2
cd GConf-2.32.4
./configure && make
make install

# first install gdk
echo "installing gdk-pixbuf with dependencies"
yum install -y libtiff-devel libjpeg-devel || exitError "error while installing libtiff-devel libjpeg-devel"

cd /tmp
wget https://download.gnome.org/sources/gdk-pixbuf/2.24/gdk-pixbuf-2.24.0.tar.bz2
tar -jxvf gdk-pixbuf-2.24.0.tar.bz2
cd gdk-pixbuf-2.24.0
./configure
make
make install

# install gtk+ with pkgconfig
echo "installing gtk+ with dependencies"
yum install -y libXcomposite libXcomposite-devel || exitError "error while installing libXcomposite"

cd /tmp
wget https://download.gnome.org/sources/gtk+/2.24/gtk+-2.24.0.tar.bz2
tar -jxvf gtk+-2.24.0.tar.bz2
cd gtk+-2.24.0
PKG_CONFIG_PATH=/usr/local/lib/pkgconfig ./configure
make
make install

# linking libraries to pre-built cypress
echo "Linking libraries (gconf, gtk, gdk, gdk-pixbuf) to pre-built Cypress at path $CYPRESS_DIST_DIR"
cd $CYPRESS_DIST_DIR
ln -PL /usr/local/lib/libgconf-2.so.4
ln -PL /usr/local/lib/libgtk-x11-2.0.so.0
ln -PL /usr/local/lib/libgdk-x11-2.0.so.0
ln -PL /usr/local/lib/libgdk_pixbuf-2.0.so.0

# echo "Done...! Please check out if any dependency is missing with: ldd $CYPRESS_DIST_DIR/Cypress | grep 'not found'"
if [[ $(ldd $CYPRESS_DIST_DIR/Cypress | grep 'not found') ]]; then
    echo "There are some dependencies that cypress is missing,"
    ldd $CYPRESS_DIST_DIR/Cypress | grep 'not found'
else
    echo "Cypress dependencies are installed. YAY"'!!'
fi

cd $ORIGINAL_DIRECTORY
