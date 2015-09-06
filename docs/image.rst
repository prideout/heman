Heman Images
############

All functions with the ``heman_image_`` prefix are meant for creating empty images, freeing memory, or examining image contents.

Images are simply arrays of floats.  By default, the value type is ``float``, but this can be overriden by setting the ``HEMAN_FLOAT`` macro to ``double``.  By design, integer-typed images are not allowed, although heman provides some conversion utilities (see `Import / Export <importexport.html>`_).

Each image has a specified number of `bands`, which is usually 1 (height maps, distance fields) or 3 (colors, normal maps).

.. c:type:: heman_image

   Encapsulates a flat array of floats and its dimensions.  The struct definition is not public, so clients must refer to it using a pointer.

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

