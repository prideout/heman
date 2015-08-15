#include "image.h"
#include <stdlib.h>
#include <math.h>
#include <assert.h>

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)
#define CLAMP(v, lo, hi) MAX(lo, MIN(hi, v))

float _gamma = 2.2f;

float* heman_image_data(heman_image* img) { return img->data; }

void heman_image_set_gamma(float g) { _gamma = g; }

void heman_image_info(heman_image* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

float* heman_image_texel(heman_image* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

heman_image* heman_image_create(int width, int height, int nbands)
{
    heman_image* img = malloc(sizeof(heman_image));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(float) * width * height * nbands);
    return img;
}

void heman_image_destroy(heman_image* img)
{
    free(img->data);
    free(img);
}

void heman_image_normalize_u8(
    heman_image* source, float minv, float maxv, heman_byte* outp)
{
    const float* inp = source->data;
    float scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        float v = 255 * (*inp++ - minv) * scale;
        *outp++ = CLAMP(v, 0, 255);
    }
}

heman_image* heman_image_normalize_f32(
    heman_image* source, float minv, float maxv)
{
    heman_image* result =
        heman_image_create(source->width, source->height, source->nbands);
    float* src = source->data;
    float* dst = result->data;
    float scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        float v = (*src++ - minv) * scale;
        *dst++ = CLAMP(v, 0, 1);
    }
    return result;
}

void heman_image_sample(heman_image* img, float u, float v, float* result)
{
    int x = CLAMP(img->width * u, 0, img->width - 1);
    int y = CLAMP(img->height * v, 0, img->height - 1);
    float* data = heman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}

heman_image* heman_image_from_u8(int width, int height, int nbands,
    const heman_byte* source, float minval, float maxval)
{
    heman_image* result = heman_image_create(width, height, nbands);
    const heman_byte* inp = source;
    float* outp = result->data;
    float scale = (maxval - minval) / 255.0f;
    int size = height * width * nbands;
    for (int i = 0; i < size; ++i) {
        float v = (*inp++) * scale + minval;
        *outp++ = CLAMP(v, minval, maxval);
    }
    return result;
}
