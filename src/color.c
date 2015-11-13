#include "image.h"
#include <assert.h>
#include <stdlib.h>
#include <math.h>

float _gamma = 2.2f;

void heman_color_set_gamma(float g) { _gamma = g; }

heman_image* heman_color_create_gradient(int width, int num_colors,
    const int* cp_locations, const heman_color* cp_values)
{
    assert(width > 0 && num_colors >= 2);
    assert(cp_locations[0] == 0);
    assert(cp_locations[num_colors - 1] == width - 1);

    // Convert incoming colors to HEMAN_FLOATs and decode gamma.
    HEMAN_FLOAT* f32colors = malloc(sizeof(HEMAN_FLOAT) * 3 * num_colors);
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    HEMAN_FLOAT* f32color = f32colors;
    const heman_color* u32color = cp_values;
    for (int index = 0; index < num_colors; index++) {
        heman_color rgb = *u32color++;
        HEMAN_FLOAT r = (HEMAN_FLOAT)(rgb >> 16) * inv;
        HEMAN_FLOAT g = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
        HEMAN_FLOAT b = (HEMAN_FLOAT)(rgb & 0xff) * inv;
        *f32color++ = pow(r, _gamma);
        *f32color++ = pow(g, _gamma);
        *f32color++ = pow(b, _gamma);
    }

    // Create and populate a width x 1 image.
    heman_image* result = heman_image_create(width, 1, 3);
    int index0 = 0;
    int index1 = 1;
    HEMAN_FLOAT* dst = result->data;
    HEMAN_FLOAT t, invgamma = 1.0f / _gamma;
    for (int x = 0; x < width; x++) {
        int loc0 = cp_locations[index0];
        int loc1 = cp_locations[index1];
        if (loc0 == loc1) {
            t = 0;
        } else {
            t = (x - loc0) / (HEMAN_FLOAT)(loc1 - loc0);
            if (t >= 1) {
                --x;
                ++index0;
                index1 = MIN(index1 + 1, num_colors - 1);
                continue;
            }
        }
        HEMAN_FLOAT r0 = f32colors[index0 * 3];
        HEMAN_FLOAT g0 = f32colors[index0 * 3 + 1];
        HEMAN_FLOAT b0 = f32colors[index0 * 3 + 2];
        HEMAN_FLOAT r1 = f32colors[index1 * 3];
        HEMAN_FLOAT g1 = f32colors[index1 * 3 + 1];
        HEMAN_FLOAT b1 = f32colors[index1 * 3 + 2];
        HEMAN_FLOAT invt = 1.0f - t;
        HEMAN_FLOAT r = (r0 * invt) + (r1 * t);
        HEMAN_FLOAT g = (g0 * invt) + (g1 * t);
        HEMAN_FLOAT b = (b0 * invt) + (b1 * t);
        *dst++ = pow(r, invgamma);
        *dst++ = pow(g, invgamma);
        *dst++ = pow(b, invgamma);
    }

    free(f32colors);
    return result;
}

heman_image* heman_color_apply_gradient(heman_image* heightmap,
    HEMAN_FLOAT minheight, HEMAN_FLOAT maxheight, heman_image* gradient)
{
    assert(heightmap->nbands == 1);
    assert(gradient->height == 1);
    assert(gradient->nbands == 3);
    int w = heightmap->width;
    int h = heightmap->height;
    heman_image* result = heman_image_create(w, h, 3);
    int size = result->height * result->width;
    HEMAN_FLOAT* dst = result->data;
    const HEMAN_FLOAT* src = heightmap->data;
    HEMAN_FLOAT scale = 1.0f / (maxheight - minheight);
    for (int i = 0; i < size; i++, dst += 3, src++) {
        HEMAN_FLOAT u = CLAMP01((*src - minheight) * scale);
        heman_image_sample(gradient, u, 0.5f, dst);
    }
    return result;
}

heman_image* heman_color_from_grayscale(heman_image* grayscale)
{
    assert(grayscale->nbands == 1);
    int w = grayscale->width;
    int h = grayscale->height;
    heman_image* result = heman_image_create(w, h, 3);
    int size = w * h;
    HEMAN_FLOAT* dst = result->data;
    const HEMAN_FLOAT* src = grayscale->data;
    for (int i = 0; i < size; i++) {
        HEMAN_FLOAT v = *src++;
        *dst++ = v;
        *dst++ = v;
        *dst++ = v;
    }
    return result;
}

heman_image* heman_color_to_grayscale(heman_image* colorimg)
{
    assert(colorimg->nbands == 3);
    int w = colorimg->width;
    int h = colorimg->height;
    heman_image* result = heman_image_create(w, h, 1);
    int size = w * h;
    HEMAN_FLOAT* dst = result->data;
    const HEMAN_FLOAT* src = colorimg->data;
    for (int i = 0; i < size; i++) {
        HEMAN_FLOAT r = *src++;
        HEMAN_FLOAT g = *src++;
        HEMAN_FLOAT b = *src++;
        *dst++ = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return result;
}

heman_image* heman_internal_rg(heman_image* cfield)
{
    assert(cfield->nbands == 2);
    int w = cfield->width;
    int h = cfield->height;
    heman_image* target = heman_image_create(w, h, 3);
    HEMAN_FLOAT* dst = target->data;
    HEMAN_FLOAT* src = cfield->data;
    int size = w * h;
    for (int i = 0; i < size; i++) {
        HEMAN_FLOAT u = *src++ / w;
        HEMAN_FLOAT v = *src++ / h;
        *dst++ = u;
        *dst++ = v;
        *dst++ = 0;
    }
    return target;
}

heman_image* heman_color_from_cpcf(heman_image* cfield, heman_image* texture)
{
    if (!texture) {
        return heman_internal_rg(cfield);
    }
    assert(cfield->nbands == 2);
    assert(texture->nbands == 3 || texture->nbands == 4);
    assert(cfield->width == texture->width);
    assert(cfield->height == texture->height);
    int w = cfield->width;
    int h = cfield->height;
    heman_image* target = heman_image_create(w, h, texture->nbands);
    HEMAN_FLOAT* dst = target->data;
    HEMAN_FLOAT* src = cfield->data;
    int size = w * h;
    for (int i = 0; i < size; i++) {
        HEMAN_FLOAT u = *src++;
        HEMAN_FLOAT v = *src++;
        HEMAN_FLOAT* texel = heman_image_texel(texture, u, v);
        for (int c = 0; c < texture->nbands; c++) {
            *dst++ = *texel++;
        }
    }
    return target;
}
