#include "image.h"
#include "noise.h"
#include <math.h>

static const float SEALEVEL = 0.5f;

#define NOISE(U, V) open_simplex_noise2(ctx, U, V)

iman_image_t* iman_generate_island_noise(int width, int height, int seed)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    iman_image_t* img = iman_image_create(width, height, 3);
    float* data = img->data;
    float invh = 1.0f / height;
    float invw = 1.0f / width;
    float freqs[] = {4.0, 8.0, 16.0, 24.0};
    float ampls[] = {0.2, 0.1, 0.025, 0.025};

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        float v = y * invh;
        float* dst = data + y * width * 3;
        for (int x = 0; x < width; ++x) {
            float u = x * invw;
            *dst++ = ampls[0] * NOISE(u * freqs[0], v * freqs[0]);
            *dst++ = ampls[1] * NOISE(u * freqs[1], v * freqs[1]);
            *dst++ = ampls[2] * NOISE(u * freqs[2], v * freqs[2]) +
                     ampls[3] * NOISE(u * freqs[3], v * freqs[3]) +
                     ampls[4] * NOISE(u * freqs[4], v * freqs[4]);
        }
    }

    open_simplex_noise_free(ctx);
    return img;
}

void iman_image_sample(iman_image_t* img, float u, float v, float* result)
{
    int x = img->width * fmod(1.0f + u, 1.0f);
    int y = img->height * fmod(1.0f + v, 1.0f);
    float* data = iman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}

iman_image_t* iman_create_island_heightmap(int width, int height, int seed)
{
    iman_image_t* noisetex = iman_generate_island_noise(width, height, seed);
    iman_image_t* coastmask = iman_image_create(width, height, 1);
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
            iman_image_sample(noisetex, u, v, n);
            u = (x - hw) * invw;
            v = vv;
            float m = 0.707f - sqrt(u * u + v * v);
            m += n[0] + n[1] + n[2];
            *dst++ = m < SEALEVEL ? 0 : 1;
        }
    }

    iman_image_destroy(noisetex);
    iman_image_t* result = iman_create_distance_field(coastmask);
    iman_image_destroy(coastmask);
    return result;
}
