#include "image.h"
#include "noise.h"
#include <math.h>
#include <memory.h>
#include <stdlib.h>
#include <kazmath/vec3.h>

static const HEMAN_FLOAT SEALEVEL = 0.5;
static const HEMAN_FLOAT DEFAULT_STRENGTH = 0.6;

#define NOISE(U, V) open_simplex_noise2(ctx, U, V)
#define NOISE3(p) open_simplex_noise3(ctx, p.x, p.y, p.z)

heman_image* heman_internal_generate_island_noise(
    int width, int height, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* img = heman_image_create(width, height, 3);
    HEMAN_FLOAT* data = img->data;
    float invh = 1.0f / MAX(width, height);
    float invw = 1.0f / MAX(width, height);
    float freqs[] = {4.0, 16.0, 32.0, 64.0, 128.0};
    float ampls[] = {0.2, 0.1, 0.05, 0.025, 0.0125};

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        float v = y * invh;
        HEMAN_FLOAT* dst = data + y * width * 3;
        for (int x = 0; x < width; ++x) {
            float u = x * invw;
            *dst++ = ampls[0] * NOISE(u * freqs[0], v * freqs[0]) +
                ampls[1] * NOISE(u * freqs[1], v * freqs[1]) +
                ampls[2] * NOISE(u * freqs[2], v * freqs[2]);
            *dst++ = ampls[3] * NOISE(u * freqs[3], v * freqs[3]) +
                ampls[4] * NOISE(u * freqs[4], v * freqs[4]);
            u += 0.5;
            *dst++ = ampls[3] * NOISE(u * freqs[3], v * freqs[3]) +
                ampls[4] * NOISE(u * freqs[4], v * freqs[4]);
        }
    }

    open_simplex_noise_free(ctx);
    return img;
}

heman_image* heman_internal_generate_rock_noise(
    int width, int height, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* img = heman_image_create(width, height, 1);
    HEMAN_FLOAT* data = img->data;
    float invh = 1.0f / MAX(width, height);
    float invw = 1.0f / MAX(width, height);
    float freqs[] = {2.0, 4.0, 16.0};
    float ampls[] = {0.2, 0.05, 0.01};

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        float v = y * invh;
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            float u = x * invw;
            *dst++ = ampls[0] * NOISE(u * freqs[0], v * freqs[0]) +
                ampls[1] * NOISE(u * freqs[1], v * freqs[1]) +
                ampls[2] * NOISE(u * freqs[2], v * freqs[2]);
        }
    }

    open_simplex_noise_free(ctx);
    return img;
}

heman_image* heman_generate_island_heightmap(int width, int height, int seed)
{
    heman_image* noisetex =
        heman_internal_generate_island_noise(width, height, seed);
    heman_image* coastmask = heman_image_create(width, height, 1);
    HEMAN_FLOAT* data = coastmask->data;
    HEMAN_FLOAT invh = 1.0f / height;
    HEMAN_FLOAT invw = 1.0f / width;
    int hh = height / 2;
    int hw = width / 2;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT vv = (y - hh) * invh;
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT n[3];
            HEMAN_FLOAT v = y * invh;
            HEMAN_FLOAT u = x * invw;
            heman_image_sample(noisetex, u, v, n);
            u = (x - hw) * invw;
            v = vv;
            u += n[1];
            v += n[2];
            HEMAN_FLOAT m = 0.707 - sqrt(u * u + v * v);
            m += n[0];
            *dst++ = m < SEALEVEL ? 0 : 1;
        }
    }

    heman_image* heightmap = heman_distance_create_sdf(coastmask);
    heman_image_destroy(coastmask);
    heman_image* result = heman_image_create(width, height, 1);
    data = result->data;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT n[3];
            HEMAN_FLOAT u = x * invw;
            HEMAN_FLOAT v = y * invh;
            heman_image_sample(noisetex, u, v, n);
            HEMAN_FLOAT z;
            heman_image_sample(heightmap, u, v, &z);
            if (z > 0.0) {
                HEMAN_FLOAT influence = z;
                u += influence * n[1];
                v += influence * n[2];
                heman_image_sample(heightmap, u, v, &z);
                z += 6 * influence * n[0];
            }
            *dst++ = z;
        }
    }

    heman_image_destroy(noisetex);
    heman_image_destroy(heightmap);
    return result;
}

heman_image* heman_generate_rock_heightmap(int width, int height, int seed)
{
    heman_image* noisetex =
        heman_internal_generate_rock_noise(width, height, seed);
    heman_image* heightmap = heman_image_create(width, height, 1);
    HEMAN_FLOAT* data = heightmap->data;
    HEMAN_FLOAT invh = 1.0f / height;
    HEMAN_FLOAT invw = 1.0f / width;
    int hh = height / 2;
    int hw = width / 2;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT vv = (y - hh) * invh;
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT v = y * invh;
            HEMAN_FLOAT u = x * invw;
            HEMAN_FLOAT n;
            heman_image_sample(noisetex, u, v, &n);
            u = (x - hw) * invw;
            v = vv;
            HEMAN_FLOAT r = 0.3 + n;
            if (u * u + v * v > r * r) {
                *dst++ = 0;
                continue;
            }
            HEMAN_FLOAT z = sqrt(r * r - u * u - v * v);
            *dst++ = z;
        }
    }

    heman_image_destroy(noisetex);
    return heightmap;
}

heman_image* heman_generate_simplex_fbm(int width, int height, float frequency,
    float amplitude, int octaves, float lacunarity, float gain, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* img = heman_image_create(width, height, 1);
    HEMAN_FLOAT* data = img->data;
    HEMAN_FLOAT invh = 1.0f / height;
    HEMAN_FLOAT invw = 1.0f / width;
    HEMAN_FLOAT ampl = amplitude;
    HEMAN_FLOAT freq = frequency;
    memset(data, 0, sizeof(HEMAN_FLOAT) * width * height);

    while (octaves--) {
#pragma omp parallel for
        for (int y = 0; y < height; ++y) {
            HEMAN_FLOAT v = y * invh;
            HEMAN_FLOAT* dst = data + y * width;
            for (int x = 0; x < width; ++x) {
                HEMAN_FLOAT u = x * invw;
                *dst++ += ampl* NOISE(u * freq, v * freq);
            }
        }
        ampl *= gain;
        freq *= lacunarity;
    }

    open_simplex_noise_free(ctx);
    return img;
}

static void sphere(float u, float v, float r, kmVec3* dst)
{
    dst->x = r * sin(v) * cos(u);
    dst->y = r * cos(v);
    dst->z = r * -sin(v) * sin(u);
}

heman_image* heman_generate_planet_heightmap(int width, int height, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* result = heman_image_create(width, height, 1);
    float scalex = 2.0f * PI / width;
    float scaley = PI / height;
    float invh = 1.0f / height;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* dst = result->data + y * width;
        kmVec3 p;
        float v = y * invh;
        float s = 0.95;
        HEMAN_FLOAT antarctic_influence = MAX(10 * (v - s) / s, -0.5);
        v = fabs(v - 0.5);
        v = 1.5 * (0.5 - v);
        float equatorial_influence = v * v;
        v = y * scaley;
        for (int x = 0; x < width; ++x) {
            float u = x * scalex;
            float freq = 1;
            float amp = 1;
            HEMAN_FLOAT h = antarctic_influence + equatorial_influence;
            for (int oct = 0; oct < 6; oct++) {
                sphere(u, v, freq, &p);
                h += amp * NOISE3(p);
                amp *= 0.5;
                freq *= 2;
            }
            *dst++ = h;
        }
    }

    open_simplex_noise_free(ctx);
    return result;
}

void heman_internal_draw_seeds(heman_image* target, heman_points* pts, int filterd)
{
    int radius = target->width / filterd;
    int fwidth = radius * 2 + 1;
    HEMAN_FLOAT* src = pts->data;
    int w = target->width;
    int h = target->height;
    for (int i = 0; i < pts->width; i++) {
        HEMAN_FLOAT x = *src++;
        HEMAN_FLOAT y = *src++;
        HEMAN_FLOAT strength = DEFAULT_STRENGTH;
        if (pts->nbands == 3) {
            strength = *src++;
        }
        strength = SEALEVEL + strength * 0.1;
        int ix = x * w;
        int iy = y * h;
        int ii = ix - radius;
        int jj = iy - radius;
        for (int kj = 0; kj < fwidth; kj++) {
            for (int ki = 0; ki < fwidth; ki++) {
                int i = ii + ki;
                int j = jj + kj;
                if (i < 0 || i >= w || j < 0 || j >= h) {
                    continue;
                }
                HEMAN_FLOAT* texel = heman_image_texel(target, i, j);
                int d2 = SQR(i - ix) + SQR(j - iy);
                HEMAN_FLOAT dist = 1 - sqrt(d2) / radius;
                *texel = MAX(*texel, strength * dist);
            }
        }
    }
}

heman_image* heman_generate_archipelago_heightmap(
    int width, int height, heman_points* points, float noiseamt, int seed)
{
    heman_image* noisetex =
        heman_internal_generate_island_noise(width, height, seed);
    heman_image* coastmask = heman_image_create(width, height, 1);
    heman_image_clear(coastmask, 0);
    heman_internal_draw_seeds(coastmask, points, 1);

    HEMAN_FLOAT* data = coastmask->data;
    HEMAN_FLOAT invh = 1.0f / height;
    HEMAN_FLOAT invw = 1.0f / width;
    int hh = height / 2;
    int hw = width / 2;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT vv = (y - hh) * invh;
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT n[3] = {0};
            HEMAN_FLOAT v = y * invh;
            HEMAN_FLOAT u = x * invw;
            heman_image_sample(noisetex, u, v, n);
            u = (x - hw) * invw;
            v = vv;
            u += noiseamt * n[1];
            v += noiseamt * n[2];
            HEMAN_FLOAT m = *dst;
            m += noiseamt * n[0];
            *dst++ = m < SEALEVEL ? 0 : 1;
        }
    }

    heman_image* heightmap = heman_distance_create_sdf(coastmask);
    heman_image_destroy(coastmask);
    heman_image* result = heman_image_create(width, height, 1);
    data = result->data;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT n[3];
            HEMAN_FLOAT u = x * invw;
            HEMAN_FLOAT v = y * invh;
            heman_image_sample(noisetex, u, v, n);
            HEMAN_FLOAT z;
            heman_image_sample(heightmap, u, v, &z);
            if (z > 0.0) {
                HEMAN_FLOAT influence = z;
                u += influence * n[1];
                v += influence * n[2];
                heman_image_sample(heightmap, u, v, &z);
                z += 6 * influence * n[0];
            }
            *dst++ = z;
        }
    }

    heman_image_destroy(noisetex);
    heman_image_destroy(heightmap);
    return result;
}

heman_image* heman_generate_archipelago_political_1(int width, int height,
    heman_points* points, const heman_color* colors, heman_color ocean,
    int seed)
{
    heman_image* contour = heman_image_create(width, height, 3);
    heman_image_clear(contour, 0);
    heman_draw_contour_from_points(contour, points, ocean, 0.40, 0.41, 1);
    heman_draw_colored_points(contour, points, colors);

    heman_image* cf = heman_distance_create_cpcf(contour);
    heman_image* warped_cpcf = heman_ops_warp(cf, seed, 4);
    heman_image* political = heman_color_from_cpcf(warped_cpcf, contour);
    heman_image_destroy(warped_cpcf);
    heman_image_destroy(cf);
    heman_image_destroy(contour);
    return political;
}

heman_image* heman_generate_archipelago_political_2(int width, int height,
    heman_color ocean, int seed, heman_image* political, int invert)
{
    heman_image* coastmask = heman_ops_extract_mask(political, ocean, invert);
    heman_image* sdf = heman_distance_create_sdf(coastmask);
    heman_image_destroy(coastmask);
    heman_image* elevation = heman_image_create(width, height, 1);
    heman_image* noisetex =
        heman_internal_generate_island_noise(width, height, seed);
    HEMAN_FLOAT* data = elevation->data;
    HEMAN_FLOAT invw = 1.0 / width;
    HEMAN_FLOAT invh = 1.0 / height;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            HEMAN_FLOAT n[3];
            HEMAN_FLOAT u = x * invw;
            HEMAN_FLOAT v = y * invh;
            heman_image_sample(noisetex, u, v, n);
            HEMAN_FLOAT z;
            heman_image_sample(sdf, u, v, &z);
            if (z > 0.0) {
                HEMAN_FLOAT influence = z;
                u += influence * n[1];
                v += influence * n[2];
                heman_image_sample(sdf, u, v, &z);
                z += 6 * influence * n[0];
            }
            *dst++ = z;
        }
    }

    heman_image_destroy(noisetex);
    heman_image_destroy(sdf);
    return elevation;
}

heman_image* heman_generate_archipelago_political_3(int width, int height,
    const heman_color* colors, int ncolors, heman_color ocean, int seed,
    heman_image* political)
{
    heman_image** elevations = malloc(sizeof(heman_image*) * ncolors);
    for (int cindex = 0; cindex < ncolors; cindex++) {
        elevations[cindex] = heman_generate_archipelago_political_2(
            width, height, colors[cindex], seed, political, 1);
    }
    heman_image* elevation = heman_image_create(width, height, 1);
    heman_image_clear(elevation, 0);
    for (int cindex = 0; cindex < ncolors; cindex++) {
#pragma omp parallel for
        for (int y = 0; y < height; ++y) {
            HEMAN_FLOAT* dst = elevation->data + y * width;
            HEMAN_FLOAT* src = elevations[cindex]->data + y * width;
            for (int x = 0; x < width; ++x, ++dst, ++src) {
                *dst = MAX(*src, *dst);
            }
        }
        heman_image_destroy(elevations[cindex]);
    }
    free(elevations);

    heman_image* ocean_elevation = heman_generate_archipelago_political_2(
        width, height, ocean, seed, political, 0);
#pragma omp parallel for
        for (int y = 0; y < height; ++y) {
            HEMAN_FLOAT* dst = elevation->data + y * width;
            HEMAN_FLOAT* src = ocean_elevation->data + y * width;
            for (int x = 0; x < width; ++x, ++dst, ++src) {
                if (*src < 0) {
                    *dst = *src;
                }
            }
        }
    heman_image_destroy(ocean_elevation);

    return elevation;
}

void heman_generate_archipelago_political(int width, int height,
    heman_points* points, const heman_color* colors, heman_color ocean,
    int seed, heman_image** elevation, heman_image** political, int elevation_mode)
{
    *political = heman_generate_archipelago_political_1(
        width, height, points, colors, ocean, seed);
    if (elevation_mode == 0) {
        *elevation = heman_generate_archipelago_political_2(
            width, height, ocean, seed, *political, 0);
    } else {
        int ncolors = points->width;
        *elevation = heman_generate_archipelago_political_3(
            width, height, colors, ncolors, ocean, seed, *political);
    }
}
