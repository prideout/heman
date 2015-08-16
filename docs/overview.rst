Heman Overview
==============

Heman is a C library of image utilities for dealing with height maps and other floating-point images.

.. image:: _static/islands.png

Heman can be used for:

* Creating random height fields using simplex noise and FBM.
* Generating a normal map from a height map using forwarding differencing.
* Efficiently computing ambient occlusion from a height map.
* Generating a signed distance field (SDF) using a `fast algorithm`_.
* Exporting a 3D mesh in PLY_ format.
* Applying a color gradient to a heightmap (LUT).
* Generating a color gradient, given a list of control points.
* Computing diffuse lighting with an infinite light source.

Why the name "heman"?
-----------------------

It's a subset of letters taken from *height map* and *normal map*.

Source code
-----------

You can access the source code at: https://github.com/prideout/heman

.. _`fast algorithm`: http://cs.brown.edu/~pff/dt/index.html
.. _PLY: http://paulbourke.net/dataformats/ply/
