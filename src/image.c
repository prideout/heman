#include "image.h"
#include <stdlib.h>
#include <math.h>
#include <assert.h>

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)
#define CLAMP(v, lo, hi) MAX(lo, MIN(hi, v))

HEMAN_FLOAT _gamma = 2.2f;

HEMAN_FLOAT* heman_image_data(heman_image* img) { return img->data; }

void heman_image_set_gamma(HEMAN_FLOAT g) { _gamma = g; }

void heman_image_info(heman_image* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

HEMAN_FLOAT* heman_image_texel(heman_image* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

heman_image* heman_image_create(int width, int height, int nbands)
{
    heman_image* img = malloc(sizeof(heman_image));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(HEMAN_FLOAT) * width * height * nbands);
    return img;
}

void heman_image_destroy(heman_image* img)
{
    free(img->data);
    free(img);
}

void heman_image_normalize_u8(
    heman_image* source, HEMAN_FLOAT minv, HEMAN_FLOAT maxv, heman_byte* outp)
{
    const HEMAN_FLOAT* inp = source->data;
    HEMAN_FLOAT scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT v = 255 * (*inp++ - minv) * scale;
        *outp++ = CLAMP(v, 0, 255);
    }
}

heman_image* heman_image_normalize_f32(
    heman_image* source, HEMAN_FLOAT minv, HEMAN_FLOAT maxv)
{
    heman_image* result =
        heman_image_create(source->width, source->height, source->nbands);
    HEMAN_FLOAT* src = source->data;
    HEMAN_FLOAT* dst = result->data;
    HEMAN_FLOAT scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT v = (*src++ - minv) * scale;
        *dst++ = CLAMP(v, 0, 1);
    }
    return result;
}

void heman_image_sample(heman_image* img, HEMAN_FLOAT u, HEMAN_FLOAT v, HEMAN_FLOAT* result)
{
    int x = CLAMP(img->width * u, 0, img->width - 1);
    int y = CLAMP(img->height * v, 0, img->height - 1);
    HEMAN_FLOAT* data = heman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}

heman_image* heman_image_from_u8(int width, int height, int nbands,
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
