#include "image.h"
#include <assert.h>

heman_image* heman_ops_step(heman_image* hmap, HEMAN_FLOAT threshold)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->width, hmap->height, 1);
    int size = hmap->height * hmap->width;
    HEMAN_FLOAT* src = hmap->data;
    HEMAN_FLOAT* dst = result->data;
    for (int i = 0; i < size; ++i) {
        *dst++ = (*src++) >= threshold ? 1 : 0;
    }
    return result;
}

heman_image* heman_ops_sweep(heman_image* hmap)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->height, 1, 1);
    HEMAN_FLOAT* dst = result->data;
    const HEMAN_FLOAT* src = hmap->data;
    HEMAN_FLOAT invw = 1.0f / hmap->width;
    for (int y = 0; y < hmap->height; y++) {
        HEMAN_FLOAT acc = 0;
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
            HEMAN_FLOAT* srcp = heman_image_texel(src, x, y);
            HEMAN_FLOAT* dstp = heman_image_texel(dst, dstx + x, y);
            *dstp++ = *srcp;
            *dstp++ = *srcp;
            *dstp = *srcp;
        }
        return;
    }
    for (int x = 0; x < width; x++) {
        HEMAN_FLOAT* srcp = heman_image_texel(src, x, y);
        HEMAN_FLOAT* dstp = heman_image_texel(dst, dstx + x, y);
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

heman_image* heman_ops_normalize_f32(
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
