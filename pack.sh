#!/bin/sh
glib-compile-schemas schemas
gnome-extensions pack --extra-source stylesheets --out-dir dist --force
