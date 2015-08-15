Images
######

All functions with the `heman_image_` prefix are meant for creating empty images, destroying images, or translating to non-float formats.

Creating and Destroying
=======================

.. code-block:: c

    // Allocate a floating-point image with dimensions width x height x nbands.
    heman_image* heman_image_create(int width, int height, int nbands);

    // Obtain image properties.
    void heman_image_info(heman_image*, int* width, int* height, int* nbands);

    // Free memory for a image.
    void heman_image_destroy(heman_image*);

Examining Texels
================

.. code-block:: c

    // Peek at the stored texel values.
    float* heman_image_data(heman_image*);

    // Peek at the given texel value.
    float* heman_image_texel(heman_image*, int x, int y);

    // Find a reasonable value for the given normalized texture coord.
    void heman_image_sample(heman_image*, float u, float v, float* result);

Import / Export
===============

Heman only knows how to operate on in-memory floating-point images.  It doesn't know how to read and write image files, although its test suite uses `stb <https://github.com/nothings/stb>`_ for handling image files.

Heman can, however, convert floating-point to unsigned bytes, or vice versa:

.. code-block:: c

    // Transform texel values so that [minval, maxval] map to [0, 255], and write
    // the result to "dest".  Values outside the range are clamped.  The source
    // image is untouched.
    void heman_image_normalize_u8(heman_image* source, float minval, float maxval,
        heman_byte* dest);
    
    // Create a single-channel floating point image from bytes, such that
    // [0, 255] map to the given [minval, maxval] range.
    heman_image* heman_image_from_u8(int width, int height, int nbands,
        const heman_byte* source, float minval, float maxval);
