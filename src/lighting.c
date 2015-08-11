#include "image.h"
#include <stdlib.h>
#include <assert.h>
#include <memory.h>
#include <kazmath/vec3.h>

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)
#define SGN(x) ((x > 0) - (x < 0))
#define EDGE(value,upper) MAX(0, MIN(upper-1, value))

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
    assert(heightmap->nbands == 1);
    assert(albedo->nbands == 3);
    int width = heightmap->width;
    int height = heightmap->height;
    assert(albedo->width == width);
    assert(albedo->height == height);
    heman_image_t* final = heman_image_create(width, height, 3);
    heman_image_t* normals = heman_lighting_compute_normals(heightmap);
    heman_image_t* occ = heman_lighting_compute_occlusion(heightmap);

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
            float of = 1 - occlusion * (1 - *heman_image_texel(occ, x, y));
            *color = *((kmVec3*) heman_image_texel(albedo, x, y));
            color->x = pow(color->x, _gamma);
            color->y = pow(color->y, _gamma);
            color->z = pow(color->z, _gamma);
            kmVec3Scale(color, color, df * of);
            color->x = pow(color->x, invgamma);
            color->y = pow(color->y, invgamma);
            color->z = pow(color->z, invgamma);
        }
    }

    heman_image_destroy(normals);
    heman_image_destroy(occ);
    return final;
}

#define NUM_SCANS (16)
#define INV_SCANS (1.0f / 16.0f)

static float azimuth_slope(kmVec3 a, kmVec3 b)
{
    kmVec3 d;
    kmVec3Subtract(&d, &a, &b);
    float x = kmVec3Length(&d);
    float y = b.z - a.z;
    return y / x;
}

static float compute_occlusion(kmVec3 thispt, kmVec3 horizonpt)
{
    kmVec3 direction;
    kmVec3Subtract(&direction, &horizonpt, &thispt);
    kmVec3Normalize(&direction, &direction);
    float dot = kmVec3Dot(&direction, &KM_VEC3_POS_Z);
    return MAX(dot, 0.0f);
}

static void horizon_scan(heman_image_t* heightmap, heman_image_t* result,
    int* startpts, int dx, int dy)
{
    int w = heightmap->width, h = heightmap->height;
    int sx = SGN(dx), sy = SGN(dy);
    int ax = abs(dx), ay = abs(dy);

    // Generate the start positions for each sweep line.  The start positions
    // occur just outside the image boundary.
    int nsweeps = ay * w + ax * h - (ax + ay - 1);
    int* p = startpts;
    for (int x = -ax; x < w - ax; x++) {
        for (int y = -ay; y < h - ay; y++) {
            if (x >= 0 && x < w && y >= 0 && y < h) {
                continue;
            }
            *p++ = (sx < 0) ? (w - x - 1) : x;
            *p++ = (sy < 0) ? (h - y - 1) : y;
        }
    }
    assert(nsweeps == (p - startpts) / 2);

    // Compute the number of steps by doing a mock sweep.
    int pathlen = 0;
    int i = startpts[0], j = startpts[1];
    do {
        i += dx;
        j += dy;
        ++pathlen;
    } while (i >= 0 && i < w && j >= 0 && j < h);

    // Each cell in the grid has a certain width and height.  These can be
    // multiplied by row / column indices to get world-space X / Y values,
    // which are in the same coordinate system as the height values.
    float cellw = 1.0f / MAX(w, h);
    float cellh = 1.0f / MAX(w, h);

    // Initialize a stack of candidate horizon points, one for each sweep.  In a
    // serial implementation we wouldn't need to allocate this much memory, but
    // we're trying to make life easy for multithreading.
    kmVec3* hull_buffer = malloc(sizeof(kmVec3) * pathlen * nsweeps);

// Finally, perform the actual sweeps. We're careful to touch each pixel
// exactly once, which makes this embarassingly threadable.
#pragma omp parallel for
    for (int sweep = 0; sweep < nsweeps; sweep++) {
        kmVec3* convex_hull = hull_buffer + sweep * pathlen;
        int* p = startpts + sweep * 2;
        int i = p[0];
        int j = p[1];
        kmVec3 thispt, horizonpt;
        thispt.x = i * cellw;
        thispt.y = j * cellh;
        thispt.z = *heman_image_texel(heightmap, EDGE(i, w), EDGE(j, h));
        int stack_top = 0;
        convex_hull[0] = thispt;
        i += dx, j += dy;
        while (i >= 0 && i < w && j >= 0 && j < h) {
            thispt.x = i * cellw;
            thispt.y = j * cellh;
            thispt.z = *heman_image_texel(heightmap, i, j);
            while (stack_top > 0) {
                float s1 = azimuth_slope(thispt, convex_hull[stack_top]);
                float s2 = azimuth_slope(thispt, convex_hull[stack_top - 1]);
                if (s1 >= s2) {
                    break;
                }
                stack_top--;
            }
            horizonpt = convex_hull[stack_top++];
            assert(stack_top < pathlen);
            convex_hull[stack_top] = thispt;
            float occlusion = compute_occlusion(thispt, horizonpt);
            *heman_image_texel(result, i, j) += INV_SCANS * occlusion;
            i += dx;
            j += dy;
        }
    }

    free(hull_buffer);
}

heman_image_t* heman_lighting_compute_occlusion(heman_image_t* heightmap)
{
    assert(heightmap->nbands == 1);
    int width = heightmap->width;
    int height = heightmap->height;
    heman_image_t* result = heman_image_create(width, height, 1);
    memset(result->data, 0, sizeof(float) * width * height);

    // Define sixteen 2D vectors, used for the sweep directions.
    const int scans[NUM_SCANS * 2] = {
        1, 0, 0, 1, -1, 0, 0, -1,                               // Rook
        1, 1, -1, -1, 1, -1, -1, 1,                             // Bishop
        2, 1, 2, -1, -2, 1, -2, -1, 1, 2, 1, -2, -1, 2, -1, -2  // Knight
    };

    // Allocate memory that will store the starting positions of each sweep.
    int* startpts = malloc(sizeof(int) * 2 * 3 * kmMax(width, height));

    // Make each sweep serially, accumulating the result.
    for (int i = 0; i < NUM_SCANS; i++) {
        int dx = scans[i * 2];
        int dy = scans[i * 2 + 1];
        horizon_scan(heightmap, result, startpts, dx, dy);
    }

    // Sanity check.  We'll remove this after the implementation is done.
    for (int i = 0; i < width * height; i++) {
        result->data[i] = 1.0f - result->data[i];
        assert(result->data[i] >= 0.0 && result->data[i] <= 1.0f);
    }

    free(startpts);
    return result;
}
