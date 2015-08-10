#include "image.h"
#include <assert.h>
#include <kazmath/vec3.h>

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)

heman_image_t* heman_lighting_compute_normals(heman_image_t* heightmap)
{
    assert(heightmap->nbands == 1);
    int width = heightmap->width;
    int height = heightmap->height;
    heman_image_t* result = heman_image_create(width, height, 3);
    float invh = 1.0f / height;
    float invw = 1.0f / width;
    int maxx = width - 1;
    int maxy = height - 1;
    kmVec3* normals = (kmVec3*) result->data;

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        float v = y * invh;
        int y1 = MIN(y + 1, maxy);
        kmVec3 p;
        kmVec3 px;
        kmVec3 py;
        kmVec3* n = normals + y * width;
        for (int x = 0; x < width; x++, n++) {
            float u = x * invw;
            int x1 = MIN(x + 1, maxx);
            p.x = u;
            p.y = v;
            p.z = *heman_image_texel(heightmap, x, y);
            px.x = u + invw;
            px.y = v;
            px.z = *heman_image_texel(heightmap, x1, y);
            py.x = u;
            py.y = v + invh;
            py.z = *heman_image_texel(heightmap, x, y1);
            kmVec3Subtract(&px, &px, &p);
            kmVec3Subtract(&py, &py, &p);
            kmVec3Cross(n, &px, &py);
            kmVec3Normalize(n, n);
            n->y *= -1;
        }
    }

    return result;
}
