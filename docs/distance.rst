Distance Fields
###############

All functions with the ``heman_distance_`` prefix are meant for creating distance fields.  This is also known as a Euclidean Distance Transform.

Heman can also create a `closest point coordinate field`_, which is like a distance field except that it encodes the ST of the nearest seed pixel.  This can be used to create Voronoi diagrams or pick sheets.

API
===

.. code-block:: c

    // Create a one-band "signed distance field" based on the given input, using
    // the fast algorithm described in Felzenszwalb 2012.
    heman_image* heman_distance_create_sdf(heman_image* monochrome);

    // Create a two-band "closest point coordinate field" containing the
    // non-normalized texture coordinates of the nearest seed.  The result is
    // related to the distance field but has a greater amount of information.
    heman_image* heman_distance_create_cpcf(heman_image* seed);

SDF Example
===========

Here's an example of a starting image (the "seed") and its resulting signed distance field (SDF).

.. image:: ../test/sdfseed.png
   :width: 240px

.. image:: _static/sdfresult.png
   :width: 240px

The above image was generated with the following program:

    .. literalinclude:: ../test/test_sdf.c
       :language: c
       :linenos:

CF Example
===========

Here's an example of a starting image (the "seed") and its resulting CPCF.

.. image:: _static/coordfields.png
   :width: 512px

.. _`closest point coordinate field`: http://http://github.prideout.net/coordinate-fields/
