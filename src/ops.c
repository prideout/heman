#include "image.h"
#include <assert.h>

heman_image* heman_ops_step(heman_image* hmap, float threshold)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->width, hmap->height, 1);
    int size = hmap->height * hmap->width;
    float* src = hmap->data;
    float* dst = result->data;
    for (int i = 0; i < size; ++i) {
        *dst++ = (*src++) >= threshold ? 1 : 0;
    }
    return result;
}

heman_image* heman_ops_sweep(heman_image* hmap)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->height, 1, 1);
    float* dst = result->data;
    const float* src = hmap->data;
    float invw = 1.0f / hmap->width;
    for (int y = 0; y < hmap->height; y++) {
        float acc = 0;
        for (int x = 0; x < hmap->width; x++) {
            acc += *src++;
        }
        *dst++ = (acc * invw);
    }
    return result;
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

heman_image* heman_ops_stitch(heman_image** images, int count)
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
