// Heman utilities.  This is part of the test suite, not the core library.

#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#define STB_IMAGE_RESIZE_IMPLEMENTATION
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-variable"
#pragma GCC diagnostic ignored "-Wunused-value"
#pragma GCC diagnostic ignored "-Wpointer-sign"
#pragma GCC diagnostic ignored "-Wunknown-pragmas"
#pragma GCC diagnostic ignored "-Wmaybe-uninitialized"
#include "stb_image_write.h"
#include "stb_image_resize.h"
#include "stb_image.h"
#pragma GCC diagnostic pop

heman_image* hut_read_image(const char* filename, int nbands)
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

void hut_write_image(const char* filename, heman_image* img, float minv, float maxv)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    heman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    heman_export_u8(img, minv, maxv, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

void hut_write_image_scaled(const char* filename, heman_image* img, int dwidth, int dheight)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    heman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    heman_export_u8(img, 0, 1, bytes);
    unsigned char* resized = malloc(dwidth * dheight * 3);
    stbir_resize_uint8(bytes, width, height, 0, resized, dwidth, dheight, 0, 3);
    stbi_write_png(filename, dwidth, dheight, ncomp, resized, dwidth * ncomp);
    free(resized);
    free(bytes);
}
