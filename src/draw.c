#include "image.h"
#include <assert.h>
#include <stdlib.h>

void heman_draw_points(heman_image* target, heman_points* pts, HEMAN_FLOAT val)
{
    assert(target->nbands == 1);
    HEMAN_FLOAT* src = pts->data;
    for (int k = 0; k < pts->width; k++) {
        HEMAN_FLOAT x = *src++;
        HEMAN_FLOAT y = *src++;
        int i = x * target->width;
        int j = y * target->height;
        if (i < 0 || i >= target->width || j < 0 || j >= target->height) {
            continue;
        }
        HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
        *texel = val;
    }
}

void heman_draw_colored_points(
    heman_image* target, heman_points* pts, const heman_color* colors)
{
    assert(target->nbands == 3);
    assert(pts->nbands == 2);
    HEMAN_FLOAT* src = pts->data;
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    for (int k = 0; k < pts->width; k++) {
        HEMAN_FLOAT x = *src++;
        HEMAN_FLOAT y = *src++;
        int i = x * target->width;
        int j = y * target->height;
        if (i < 0 || i >= target->width || j < 0 || j >= target->height) {
            continue;
        }
        HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
        heman_color rgb = colors[k];
        *texel++ = (HEMAN_FLOAT)(rgb >> 16) * inv;
        *texel++ = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
        *texel = (HEMAN_FLOAT)(rgb & 0xff) * inv;
    }
}

void heman_draw_splats(
    heman_image* target, heman_points* pts, int radius, int blend_mode)
{
    int fwidth = radius * 2 + 1;
    HEMAN_FLOAT* gaussian_splat = malloc(fwidth * fwidth * sizeof(HEMAN_FLOAT));
    generate_gaussian_splat(gaussian_splat, fwidth);
    HEMAN_FLOAT* src = pts->data;
    int w = target->width;
    int h = target->height;
    for (int i = 0; i < pts->width; i++) {
        HEMAN_FLOAT x = *src++;
        HEMAN_FLOAT y = *src++;
        int ii = x * w - radius;
        int jj = y * h - radius;
        for (int kj = 0; kj < fwidth; kj++) {
            for (int ki = 0; ki < fwidth; ki++) {
                int i = ii + ki;
                int j = jj + kj;
                if (i < 0 || i >= w || j < 0 || j >= h) {
                    continue;
                }
                HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
                *texel += gaussian_splat[kj * fwidth + ki];
            }
        }
    }
    free(gaussian_splat);
}
