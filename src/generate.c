#include "image.h"
#include "noise.h"
#include <math.h>
#include <memory.h>

static const float SEALEVEL = 0.5f;

#define NOISE(U, V) open_simplex_noise2(ctx, U, V)
#define MAX(a, b) (a > b ? a : b)
#define MIN(a, b) (a > b ? b : a)

static heman_image* generate_island_noise(int width, int height, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* img = heman_image_create(width, height, 3);
    float* data = img->data;
    float invh = 1.0f / MAX(width, height);
    float invw = 1.0f / MAX(width, height);
    float freqs[] = {4.0, 16.0, 32.0, 64.0, 128.0};
    float ampls[] = {0.2, 0.1, 0.05, 0.025, 0.0125};

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        float v = y * invh;
        float* dst = data + y * width * 3;
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

heman_image* heman_generate_island_heightmap(int width, int height, int seed)
{
    heman_image* noisetex = generate_island_noise(width, height, seed);
    heman_image* coastmask = heman_image_create(width, height, 1);
    float* data = coastmask->data;
    float invh = 1.0f / height;
    float invw = 1.0f / width;
    int hh = height / 2;
    int hw = width / 2;

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        float vv = (y - hh) * invh;
        float* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            float n[3];
            float v = y * invh;
            float u = x * invw;
            heman_image_sample(noisetex, u, v, n);
            u = (x - hw) * invw;
            v = vv;
            u += n[1];
            v += n[2];
            float m = 0.707f - sqrt(u * u + v * v);
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
        float* dst = data + y * width;
        for (int x = 0; x < width; ++x) {
            float n[3];
            float u = x * invw;
            float v = y * invh;
            heman_image_sample(noisetex, u, v, n);
            float z;
            heman_image_sample(heightmap, u, v, &z);
            if (z > 0.0) {
                float influence = z;
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

heman_image* heman_generate_simplex_fbm(int width, int height, float frequency,
    float amplitude, int octaves, float lacunarity, float gain, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    heman_image* img = heman_image_create(width, height, 1);
    float* data = img->data;
    float invh = 1.0f / height;
    float invw = 1.0f / width;
    float ampl = amplitude;
    float freq = frequency;
    memset(data, 0, sizeof(float) * width * height);

    while (octaves--) {
#pragma omp parallel for
        for (int y = 0; y < height; ++y) {
            float v = y * invh;
            float* dst = data + y * width;
            for (int x = 0; x < width; ++x) {
                float u = x * invw;
                *dst++ += ampl* NOISE(u * freq, v * freq);
            }
        }
        ampl *= gain;
        freq *= lacunarity;
    }

    open_simplex_noise_free(ctx);
    return img;
}
