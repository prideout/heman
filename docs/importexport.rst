Import / Export
###############

Heman only knows how to work with in-memory floating-point images.  It doesn't know how to read and write image files, although the test suite uses `stb <https://github.com/nothings/stb>`_ for handling image files.  See the heman utility header (`hut.h <https://github.com/prideout/heman/blob/master/test/hut.h>`_) for an example of this.

Heman can, however, convert floating-point to unsigned bytes, or vice versa, using one of the following functions.

.. c:function:: heman_image* heman_import_u8(int width, int height, int nbands, const heman_byte* source, float minval, float maxval)

   Create a single-channel floating point image from bytes, such that [0, 255] maps to the given [minval, maxval] range.

.. c:function:: void heman_export_u8(heman_image* source, float minval, float maxval, heman_byte* dest)

   Transform texel values so that [minval, maxval] maps to [0, 255], and write the result to "dest".  Values outside the range are clamped.


Example with STB
================

This function uses ``stbi_load`` to load the given PNG file and convert it into a floating-point image in the range **[0, 1]**.

.. code-block:: c

    heman_image* read_image(const char* filename, int nbands)
    {
        int width = 0, height = 0;
        stbi_uc* bytes;
        heman_image* retval;
        bytes = stbi_load(filename, &width, &height, &nbands, nbands);
        assert(bytes);
        printf("%4d x %4d x %d :: %s\n", width, height, nbands, filename);
        retval = heman_import_u8(width, height, nbands, bytes, 0, 1);
        stbi_image_free(bytes);
        return retval;
    }

3D Mesh Data
============

Heman can export a binary mesh file representing height field data, where each grid cell in the mesh corresponds to a single texel in the height field:

.. code-block:: c

    // Create a mesh with (width - 1) x (height - 1) quads.
    void heman_export_ply(heman_image*, const char* filename);
    
    // Create a mesh with (width - 1) x (height - 1) quads and per-vertex colors.
    void heman_export_with_colors_ply(
        heman_image* heightmap, heman_image* colors, const char* filename);
