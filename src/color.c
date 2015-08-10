#include "image.h"
#include <assert.h>
#include <stdlib.h>
#include <math.h>

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)
#define CLAMP(v) MAX(0.0f, MIN(1.0f, v))

heman_image_t* heman_color_create_gradient(int width, int num_colors,
    const int* cp_locations, const uint32_t* cp_values)
{
    assert(width > 0 && num_colors >= 2);
    assert(cp_locations[0] == 0);
    assert(cp_locations[num_colors - 1] == width - 1);

    // Convert incoming colors to floats and decode gamma.
    float* f32colors = malloc(sizeof(float) * 3 * num_colors);
    float inv = 1.0f / 255.0f;
    float* f32color = f32colors;
    const uint32_t* u32color = cp_values;
    for (int index = 0; index < num_colors; index++) {
        uint32_t rgb = *u32color++;
        float r = (float) (rgb >> 16) * inv;
        float g = (float) ((rgb >> 8) & 0xff) * inv;
        float b = (float) (rgb & 0xff) * inv;
        *f32color++ = pow(r, _gamma);
        *f32color++ = pow(g, _gamma);
        *f32color++ = pow(b, _gamma);
    }

    // Create and populate a width x 1 image.
    heman_image_t* result = heman_image_create(width, 1, 3);
    int index0 = 0;
    int index1 = 1;
    float* dst = result->data;
    float t, invgamma = 1.0f / _gamma;
    for (int x = 0; x < width; x++) {
        int loc0 = cp_locations[index0];
        int loc1 = cp_locations[index1];
        if (loc0 == loc1) {
            t = 0;
        } else {
            t = (x - loc0) / (float) (loc1 - loc0);
            if (t >= 1) {
                --x;
                ++index0;
                index1 = MIN(index1 + 1, num_colors - 1);
                continue;
            }
        }
        float r0 = f32colors[index0 * 3];
        float g0 = f32colors[index0 * 3 + 1];
        float b0 = f32colors[index0 * 3 + 2];
        float r1 = f32colors[index1 * 3];
        float g1 = f32colors[index1 * 3 + 1];
        float b1 = f32colors[index1 * 3 + 2];
        float invt = 1.0f - t;
        float r = (r0 * invt) + (r1 * t);
        float g = (g0 * invt) + (g1 * t);
        float b = (b0 * invt) + (b1 * t);
        *dst++ = pow(r, invgamma);
        *dst++ = pow(g, invgamma);
        *dst++ = pow(b, invgamma);
    }

    free(f32colors);
    return result;
}

heman_image_t* heman_color_apply_gradient(heman_image_t* heightmap,
    float minheight, float maxheight, heman_image_t* gradient)
{
    assert(heightmap->nbands == 1);
    assert(gradient->height == 1);
    assert(gradient->nbands == 3);
    int w = heightmap->width;
    int h = heightmap->height;
    heman_image_t* result = heman_image_create(w, h, 3);
    int size = result->height * result->width;
    float* dst = result->data;
    const float* src = heightmap->data;
    float scale = 1.0f / (maxheight - minheight);
    for (int i = 0; i < size; i++, dst += 3, src++) {
        float u = CLAMP((*src - minheight) * scale);
        heman_image_sample(gradient, u, 0.5f, dst);
    }
    return result;
}
