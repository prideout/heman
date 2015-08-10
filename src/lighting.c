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

heman_image_t* heman_lighting_apply(heman_image_t* heightmap,
    heman_image_t* albedo, float occlusion, float diffuse,
    float diffuse_softening, float* light_position)
{
    assert(occlusion == 0 && "Not yet implemented.");
    assert(heightmap->nbands == 1);
    assert(albedo->nbands == 3);
    int width = heightmap->width;
    int height = heightmap->height;
    assert(albedo->width == width);
    assert(albedo->height == height);
    heman_image_t* final = heman_image_create(width, height, 3);
    heman_image_t* normals = heman_lighting_compute_normals(heightmap);
    kmVec3* colors = (kmVec3*) final->data;
    float invgamma = 1.0f / _gamma;

    kmVec3 L;
    L.x = light_position[0];
    L.y = light_position[1];
    L.z = light_position[2];
    kmVec3Normalize(&L, &L);

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        kmVec3* color = colors + y * width;
        for (int x = 0; x < width; x++, color++) {
            kmVec3* N = (kmVec3*) heman_image_texel(normals, x, y);
            kmVec3Lerp(N, N, &KM_VEC3_POS_Z, diffuse_softening);
            float df = 1 - diffuse * (1 - kmClamp(kmVec3Dot(N, &L), 0, 1));
            *color = *((kmVec3*) heman_image_texel(albedo, x, y));

            color->x = pow(color->x, _gamma);
            color->y = pow(color->y, _gamma);
            color->z = pow(color->z, _gamma);

            kmVec3Scale(color, color, df);

            color->x = pow(color->x, invgamma);
            color->y = pow(color->y, invgamma);
            color->z = pow(color->z, invgamma);
        }
    }

    heman_image_destroy(normals);
    return final;
}
