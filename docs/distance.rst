Distance Fields
###############

All functions with the ``heman_distance_`` prefix are meant for creating distance fields.  This is also known as a Euclidean Distance Transform.

API
===

.. code-block:: c

    // Create a signed distance field based on the given input, using the very
    // fast algorithm described in Felzenszwalb 2012.
    heman_image* heman_distance_create_sdf(heman_image* monochrome);


Example
=======

Here's an example of a starting image (the "seed") and its resulting signed distance field (SDF).

.. image:: ../test/sdfseed.png
   :width: 240px

.. image:: _static/sdfresult.png
   :width: 240px

The above image was generated with the following program:

    .. literalinclude:: ../test/test_sdf.c
       :language: c
       :linenos:
