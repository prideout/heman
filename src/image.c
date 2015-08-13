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
    int x = img->width * fmod(1.0f + u, 1.0f);
    int y = img->height * fmod(1.0f + v, 1.0f);
    float* data = heman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}

static void copy_row(heman_image* src, heman_image* dst, int dstx, int y)
{
    int width = src->width;
    if (src->nbands == 1) {
        for (int x = 0; x < width; x++) {
            float* srcp = heman_image_texel(src, x, y);
            float* dstp = heman_image_texel(dst, dstx + x, y);
            *dstp++ = *srcp;
            *dstp++ = *srcp;
            *dstp = *srcp;
        }
        return;
    }
    for (int x = 0; x < width; x++) {
        float* srcp = heman_image_texel(src, x, y);
        float* dstp = heman_image_texel(dst, dstx + x, y);
        *dstp++ = *srcp++;
        *dstp++ = *srcp++;
        *dstp = *srcp;
    }
}

heman_image* heman_image_stitch(heman_image** images, int count)
{
    assert(count > 0);
    int width = images[0]->width;
    int height = images[0]->height;
    for (int i = 0; i < count; i++) {
        assert(images[i]->width == width);
        assert(images[i]->height == height);
        assert(images[i]->nbands == 1 || images[i]->nbands == 3);
    }
    heman_image* result = heman_image_create(width * count, height, 3);

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        int x = 0;
        for (int tile = 0; tile < count; tile++) {
            copy_row(images[tile], result, x, y);
            x += width;
        }
    }

    return result;
}
