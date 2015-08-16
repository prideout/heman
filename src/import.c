#include "image.h"

heman_image* heman_import_u8(int width, int height, int nbands,
    const heman_byte* source, HEMAN_FLOAT minval, HEMAN_FLOAT maxval)
{
    heman_image* result = heman_image_create(width, height, nbands);
    const heman_byte* inp = source;
    HEMAN_FLOAT* outp = result->data;
    HEMAN_FLOAT scale = (maxval - minval) / 255.0f;
    int size = height * width * nbands;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT v = (*inp++) * scale + minval;
        *outp++ = CLAMP(v, minval, maxval);
    }
    return result;
}
