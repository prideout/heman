Image Operations
################

All functions with the ``heman_ops_`` prefix are meant for doing very simple image operations that are outside of heman's core functionality.

.. code-block:: c

    // Given a set of same-sized images, copy them into a horizontal filmstrip.
    heman_image* heman_ops_stitch_horizontal(heman_image** images, int count);

    // Given a set of same-sized images, copy them into a vertical filmstrip.
    heman_image* heman_ops_stitch_vertical(heman_image** images, int count);

    // Transform texel values so that [minval, maxval] map to [0, 1] and return the
    // result.  Values outside the range are clamped.  The source image is
    // untouched.
    heman_image* heman_ops_normalize_f32(
        heman_image* source, HEMAN_FLOAT minval, HEMAN_FLOAT maxval);

    // Generate a monochrome image by applying a step function.
    heman_image* heman_ops_step(heman_image* image, HEMAN_FLOAT threshold);

    // Generate a height x 1 x 1 image by averaging the values across each row.
    heman_image* heman_ops_sweep(heman_image* image);
