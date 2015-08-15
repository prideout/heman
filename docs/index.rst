heman |release|
===============

heman is a library of image utilities for dealing with height maps and other floating-point images, written in C99.

Features
--------

heman |version| currently supports:

* Generate a normal map from a height map.
* Compute ambient occlusion from a height map.
* Generate a signed distance field (SDF) using a `fast algorithm`_.
* Export a 3D mesh in PLY_ format.
* Create an image that sums up several octaves of simplex noise.
* Apply a color gradient to a heightmap.
* Generate a color gradient, given a list of control points.
* Compute diffuse lighting with an infinite light source.

Why the name "heman"?
-----------------------

It's a subset of letters taken from *height map* and *normal map*.

Source code
-----------

You can access the source code at: https://github.com/prideout/heman

Documentation
-------------

.. toctree::
   :maxdepth: 2

   image
   distance

.. Links

.. _`fast algorithm`: http://cs.brown.edu/~pff/dt/index.html
.. _PLY: http://paulbourke.net/dataformats/ply/
