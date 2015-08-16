Distance Fields
###############

All functions with the ``heman_distance_`` prefix are meant for creating distance fields.  This is also known as a Euclidean Distance Transform.

.. code-block:: c

    // Create a signed distance field based on the given input, using the very
    // fast algorithm described in Felzenszwalb 2012.
    heman_image* heman_distance_create_sdf(heman_image* monochrome);
