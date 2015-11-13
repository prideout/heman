#include "image.h"
#include <assert.h>
#include <stdlib.h>

void heman_draw_points(heman_image* target, heman_points* pts, HEMAN_FLOAT val)
{
    HEMAN_FLOAT* src = pts->data;
    for (int k = 0; k < pts->width; k++) {
        HEMAN_FLOAT x = src[0];
        HEMAN_FLOAT y = src[1];
        src += pts->nbands;
        int i = x * target->width;
        int j = y * target->height;
        if (i < 0 || i >= target->width || j < 0 || j >= target->height) {
            continue;
        }
        HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
        for (int c = 0; c < target->nbands; c++) {
            *texel++ = val;
        }
    }
}

void heman_draw_colored_points(
    heman_image* target, heman_points* pts, const heman_color* colors)
{
    assert(target->nbands == 3 || target->nbands == 4);
    HEMAN_FLOAT* src = pts->data;
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    for (int k = 0; k < pts->width; k++) {
        HEMAN_FLOAT x = src[0];
        HEMAN_FLOAT y = src[1];
        src += pts->nbands;
        int i = x * target->width;
        int j = y * target->height;
        if (i < 0 || i >= target->width || j < 0 || j >= target->height) {
            continue;
        }
        HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
        heman_color rgb = colors[k];
        *texel++ = (HEMAN_FLOAT)((rgb >> 16) & 0xff) * inv;
        *texel++ = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
        *texel++ = (HEMAN_FLOAT)(rgb & 0xff) * inv;
        if (target->nbands == 4) {
            *texel = (HEMAN_FLOAT)(rgb >> 24) * inv;
        }
    }
}

void heman_draw_colored_circles(heman_image* target, heman_points* pts,
    int radius, const heman_color* colors)
{
    int fwidth = radius * 2 + 1;
    int radius2 = radius * radius;
    HEMAN_FLOAT* src = pts->data;
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    int w = target->width;
    int h = target->height;
    for (int k = 0; k < pts->width; k++) {
        HEMAN_FLOAT x = src[0];
        HEMAN_FLOAT y = src[1];
        src += pts->nbands;
        int ii = x * w - radius;
        int jj = y * h - radius;
        for (int kj = 0; kj < fwidth; kj++) {
            for (int ki = 0; ki < fwidth; ki++) {
                int i = ii + ki;
                int j = jj + kj;
                int r2 = SQR(i - x * w) + SQR(j - y * h);
                if (r2 > radius2) {
                    continue;
                }
                HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
                heman_color rgb = colors[k];
                *texel++ = (HEMAN_FLOAT)(rgb >> 16) * inv;
                *texel++ = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
                *texel = (HEMAN_FLOAT)(rgb & 0xff) * inv;
            }
        }
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
                for (int c = 0; c < target->nbands; c++) {
                    *texel++ += gaussian_splat[kj * fwidth + ki];
                }
            }
        }
    }
    free(gaussian_splat);
}

void heman_internal_draw_seeds(heman_image* target, heman_points* pts, int filterd);

void heman_draw_contour_from_points(heman_image* target, heman_points* coords,
    heman_color rgb, float mind, float maxd, int filterd)
{
    assert(target->nbands == 3 || target->nbands == 4);
    int width = target->width;
    int height = target->height;
    heman_image* seed = heman_image_create(width, height, 1);
    heman_image_clear(seed, 0);

    heman_internal_draw_seeds(seed, coords, filterd);

    HEMAN_FLOAT inv = 1.0f / 255.0f;
    HEMAN_FLOAT r = (HEMAN_FLOAT)((rgb >> 16) & 0xff) * inv;
    HEMAN_FLOAT g = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
    HEMAN_FLOAT b = (HEMAN_FLOAT)(rgb & 0xff) * inv;
    HEMAN_FLOAT a = 1;
    if (target->nbands == 4) {
        a = (HEMAN_FLOAT)(rgb >> 24) * inv;
    }

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        HEMAN_FLOAT* dst = target->data + y * width * target->nbands;
        for (int x = 0; x < width; x++) {
            HEMAN_FLOAT dist = *heman_image_texel(seed, x, y);
            if (dist > mind && dist < maxd) {
                dst[0] = r;
                dst[1] = g;
                dst[2] = b;
                if (target->nbands == 4) {
                    dst[3] = a;
                }
            }
            dst += target->nbands;
        }
    }

    heman_points_destroy(seed);
}
