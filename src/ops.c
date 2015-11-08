#include "image.h"
#include "noise.h"
#include <assert.h>
#include <memory.h>
#include <kazmath/vec3.h>

#define NOISEX(U, V, A, F) (A * open_simplex_noise2(ctx, U * F, V * F))

#define NOISEY(U, V, A, F) (A * open_simplex_noise2(ctx, U * F + 0.5, V * F))

heman_image* heman_ops_step(heman_image* hmap, HEMAN_FLOAT threshold)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->width, hmap->height, 1);
    int size = hmap->height * hmap->width;
    HEMAN_FLOAT* src = hmap->data;
    HEMAN_FLOAT* dst = result->data;
    for (int i = 0; i < size; ++i) {
        *dst++ = (*src++) >= threshold ? 1 : 0;
    }
    return result;
}

heman_image* heman_ops_sweep(heman_image* hmap)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->height, 1, 1);
    HEMAN_FLOAT* dst = result->data;
    const HEMAN_FLOAT* src = hmap->data;
    HEMAN_FLOAT invw = 1.0f / hmap->width;
    for (int y = 0; y < hmap->height; y++) {
        HEMAN_FLOAT acc = 0;
        for (int x = 0; x < hmap->width; x++) {
            acc += *src++;
        }
        *dst++ = (acc * invw);
    }
    return result;
}

static void copy_row(heman_image* src, heman_image* dst, int dstx, int y)
{
    int width = src->width;
    if (src->nbands == 1) {
        for (int x = 0; x < width; x++) {
            HEMAN_FLOAT* srcp = heman_image_texel(src, x, y);
            HEMAN_FLOAT* dstp = heman_image_texel(dst, dstx + x, y);
            *dstp = *srcp;
        }
        return;
    }
    for (int x = 0; x < width; x++) {
        HEMAN_FLOAT* srcp = heman_image_texel(src, x, y);
        HEMAN_FLOAT* dstp = heman_image_texel(dst, dstx + x, y);
        int nbands = src->nbands;
        while (nbands--) {
            *dstp++ = *srcp++;
        }
    }
}

heman_image* heman_ops_stitch_horizontal(heman_image** images, int count)
{
    assert(count > 0);
    int width = images[0]->width;
    int height = images[0]->height;
    int nbands = images[0]->nbands;
    for (int i = 1; i < count; i++) {
        assert(images[i]->width == width);
        assert(images[i]->height == height);
        assert(images[i]->nbands == nbands);
    }
    heman_image* result = heman_image_create(width * count, height, nbands);

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        for (int tile = 0; tile < count; tile++) {
            copy_row(images[tile], result, tile * width, y);
        }
    }

    return result;
}

heman_image* heman_ops_stitch_vertical(heman_image** images, int count)
{
    assert(count > 0);
    int width = images[0]->width;
    int height = images[0]->height;
    int nbands = images[0]->nbands;
    for (int i = 1; i < count; i++) {
        assert(images[i]->width == width);
        assert(images[i]->height == height);
        assert(images[i]->nbands == nbands);
    }
    heman_image* result = heman_image_create(width, height * count, nbands);
    int size = width * height * nbands;
    HEMAN_FLOAT* dst = result->data;
    for (int tile = 0; tile < count; tile++) {
        memcpy(dst, images[tile]->data, size * sizeof(float));
        dst += size;
    }
    return result;
}

heman_image* heman_ops_normalize_f32(
    heman_image* source, HEMAN_FLOAT minv, HEMAN_FLOAT maxv)
{
    heman_image* result =
        heman_image_create(source->width, source->height, source->nbands);
    HEMAN_FLOAT* src = source->data;
    HEMAN_FLOAT* dst = result->data;
    HEMAN_FLOAT scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT v = (*src++ - minv) * scale;
        *dst++ = CLAMP(v, 0, 1);
    }
    return result;
}

heman_image* heman_ops_laplacian(heman_image* heightmap)
{
    assert(heightmap->nbands == 1);
    int width = heightmap->width;
    int height = heightmap->height;
    heman_image* result = heman_image_create(width, height, 1);
    int maxx = width - 1;
    int maxy = height - 1;

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        int y1 = MIN(y + 1, maxy);
        HEMAN_FLOAT* dst = result->data + y * width;
        for (int x = 0; x < width; x++) {
            int x1 = MIN(x + 1, maxx);
            HEMAN_FLOAT p = *heman_image_texel(heightmap, x, y);
            HEMAN_FLOAT px = *heman_image_texel(heightmap, x1, y);
            HEMAN_FLOAT py = *heman_image_texel(heightmap, x, y1);
            *dst++ = (p - px) * (p - px) + (p - py) * (p - py);
        }
    }

    return result;
}

void heman_ops_accumulate(heman_image* dst, heman_image* src)
{
    assert(dst->nbands == src->nbands);
    assert(dst->width == src->width);
    assert(dst->height == src->height);
    int size = dst->height * dst->width;
    HEMAN_FLOAT* sdata = src->data;
    HEMAN_FLOAT* ddata = dst->data;
    for (int i = 0; i < size; ++i) {
        *ddata++ += (*sdata++);
    }
}

heman_image* heman_ops_sobel(heman_image* img, heman_color rgb)
{
    int width = img->width;
    int height = img->height;
    assert(img->nbands == 3);
    heman_image* result = heman_image_create(width, height, 3);
    heman_image* gray = heman_color_to_grayscale(img);
    HEMAN_FLOAT inv = 1.0f / 255.0f;

    kmVec3 edge_rgb;
    edge_rgb.x = (HEMAN_FLOAT)(rgb >> 16) * inv;
    edge_rgb.y = (HEMAN_FLOAT)((rgb >> 8) & 0xff) * inv;
    edge_rgb.z = (HEMAN_FLOAT)(rgb & 0xff) * inv;

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        kmVec3* dst = (kmVec3*) result->data + y * width;
        const kmVec3* src = (kmVec3*) img->data + y * width;
        for (int x = 0; x < width; x++) {
            int xm1 = MAX(x - 1, 0);
            int xp1 = MIN(x + 1, width - 1);
            int ym1 = MAX(y - 1, 0);
            int yp1 = MIN(y + 1, height - 1);
            HEMAN_FLOAT t00 = *heman_image_texel(gray, xm1, ym1);
            HEMAN_FLOAT t10 = *heman_image_texel(gray, x, ym1);
            HEMAN_FLOAT t20 = *heman_image_texel(gray, xp1, ym1);
            HEMAN_FLOAT t01 = *heman_image_texel(gray, xm1, 0);
            HEMAN_FLOAT t21 = *heman_image_texel(gray, xp1, 0);
            HEMAN_FLOAT t02 = *heman_image_texel(gray, xm1, yp1);
            HEMAN_FLOAT t12 = *heman_image_texel(gray, x, yp1);
            HEMAN_FLOAT t22 = *heman_image_texel(gray, xp1, yp1);
            HEMAN_FLOAT gx = t00 + 2.0 * t01 + t02 - t20 - 2.0 * t21 - t22;
            HEMAN_FLOAT gy = t00 + 2.0 * t10 + t20 - t02 - 2.0 * t12 - t22;
            HEMAN_FLOAT is_edge = gx * gx + gy * gy > 1e-5;
            kmVec3Lerp(dst++, src++, &edge_rgb, is_edge);
        }
    }

    heman_image_destroy(gray);
    return result;
}

heman_image* heman_ops_warp(heman_image* img, int seed, int octaves)
{
    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    int width = img->width;
    int height = img->height;
    int nbands = img->nbands;
    heman_image* result = heman_image_create(width, height, nbands);
    HEMAN_FLOAT invw = 1.0 / width;
    HEMAN_FLOAT invh = 1.0 / height;
    HEMAN_FLOAT inv = MIN(invw, invh);
    HEMAN_FLOAT aspect = (float) width / height;
    float gain = 0.6;
    float lacunarity = 2.0;
    float initial_amplitude = 0.05;
    float initial_frequency = 8.0;

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        HEMAN_FLOAT* dst = result->data + y * width * nbands;
        for (int x = 0; x < width; x++) {
            float s = x * inv;
            float t = y * inv;
            float u = x * invw;
            float v = y * invh;
            float a = initial_amplitude;
            float f = initial_frequency;
            for (int i = 0; i < octaves; i++) {
                u += NOISEX(s, t, a, f);
                v += aspect * NOISEY(s, t, a, f);
                a *= gain;
                f *= lacunarity;
            }
            int i = CLAMP(u * width, 0, width - 1);
            int j = CLAMP(v * height, 0, height - 1);
            HEMAN_FLOAT* src = heman_image_texel(img, i, j);
            for (int n = 0; n < nbands; n++) {
                *dst++ = *src++;
            }
        }
    }

    open_simplex_noise_free(ctx);
    return result;
}

heman_image* heman_ops_extract_mask(heman_image* source, heman_color color)
{
    assert(source->nbands == 3);
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    HEMAN_FLOAT r = (HEMAN_FLOAT)(color >> 16) * inv;
    HEMAN_FLOAT g = (HEMAN_FLOAT)((color >> 8) & 0xff) * inv;
    HEMAN_FLOAT b = (HEMAN_FLOAT)(color & 0xff) * inv;
    int height = source->height;
    int width = source->width;
    heman_image* result = heman_image_create(width, height, 1);

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        HEMAN_FLOAT* dst = result->data + y * width;
        HEMAN_FLOAT* src = source->data + y * width * 3;
        for (int x = 0; x < width; x++, src += 3) {
            *dst++ = 1 - ((src[0] == r) && (src[1] == g) && (src[2] == b));
        }
    }

    return result;
}

heman_image* heman_ops_replace_color(
    heman_image* source, heman_color color, heman_image* texture)
{
    assert(source->nbands == 3);
    assert(texture->nbands == 3);
    int height = source->height;
    int width = source->width;
    assert(texture->width == width);
    assert(texture->height == height);
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    HEMAN_FLOAT r = (HEMAN_FLOAT)(color >> 16) * inv;
    HEMAN_FLOAT g = (HEMAN_FLOAT)((color >> 8) & 0xff) * inv;
    HEMAN_FLOAT b = (HEMAN_FLOAT)(color & 0xff) * inv;
    heman_image* result = heman_image_create(width, height, 3);

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        HEMAN_FLOAT* dst = result->data + y * width * 3;
        HEMAN_FLOAT* src = source->data + y * width * 3;
        HEMAN_FLOAT* tex = texture->data + y * width * 3;
        for (int x = 0; x < width; x++, src += 3, dst += 3, tex += 3) {
            if ((src[0] == r) && (src[1] == g) && (src[2] == b)) {
                dst[0] = tex[0];
                dst[1] = tex[1];
                dst[2] = tex[2];
            } else {
                dst[0] = src[0];
                dst[1] = src[1];
                dst[2] = src[2];
            }
        }
    }

    return result;
}

heman_image* heman_ops_stairstep(heman_image* hmap, int nsteps_water,
    int nsteps_land, float lip)
{
    assert(hmap->nbands == 1);
    heman_image* result = heman_image_create(hmap->width, hmap->height, 1);
    int size = hmap->height * hmap->width;
    HEMAN_FLOAT* src = hmap->data;
    HEMAN_FLOAT* dst = result->data;
    HEMAN_FLOAT minv = 1000;
    HEMAN_FLOAT maxv = -1000;
    for (int i = 0; i < size; ++i) {
        minv = MIN(minv, src[i]);
        maxv = MAX(maxv, src[i]);
    }
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT e = *src++;
        if (e < 0) {
            e /= minv;
            e *= nsteps_water;
            e = -(floor(e * nsteps_water) + lip) / nsteps_water;
        } else {
            e /= maxv;
            e = (floor(e * nsteps_land) + lip) / nsteps_land;
        }
        *dst++ = e;
    }
    return result;
}

heman_image* heman_ops_merge_political(
    heman_image* hmap, heman_image* cmap, heman_color ocean)
{
    assert(hmap->nbands == 1);
    assert(cmap->nbands == 3);
    heman_image* result = heman_image_create(hmap->width, hmap->height, 4);
    HEMAN_FLOAT* pheight = hmap->data;
    HEMAN_FLOAT* pcolour = cmap->data;
    HEMAN_FLOAT* pmerged = result->data;
    HEMAN_FLOAT inv = 1.0f / 255.0f;
    HEMAN_FLOAT oceanr = (HEMAN_FLOAT)(ocean >> 16) * inv;
    HEMAN_FLOAT oceang = (HEMAN_FLOAT)((ocean >> 8) & 0xff) * inv;
    HEMAN_FLOAT oceanb = (HEMAN_FLOAT)(ocean & 0xff) * inv;
    int size = hmap->height * hmap->width;
    float minh = 1000;
    float maxh = -1000;
    for (int i = 0; i < size; ++i) {
        minh = MIN(minh, pheight[i]);
        maxh = MIN(maxh, pheight[i]);
    }
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT h = *pheight++;
        if (h < 0) {
            *pmerged++ = oceanr;
            *pmerged++ = oceang;
            *pmerged++ = oceanb;
            pcolour += 3;
        } else {
            *pmerged++ = *pcolour++;
            *pmerged++ = *pcolour++;
            *pmerged++ = *pcolour++;
        }
        *pmerged++ = (h - minh) / (maxh - minh);
    }
    return result;
}

heman_image* heman_ops_emboss(heman_image* img, int mode)
{
    int seed = 1;
    int octaves = 4;

    struct osn_context* ctx;
    open_simplex_noise(seed, &ctx);
    int width = img->width;
    int height = img->height;
    assert(img->nbands == 1);
    heman_image* result = heman_image_create(width, height, 1);
    HEMAN_FLOAT invw = 1.0 / width;
    HEMAN_FLOAT invh = 1.0 / height;
    HEMAN_FLOAT inv = MIN(invw, invh);
    HEMAN_FLOAT aspect = (float) width / height;
    float gain = 0.6;
    float lacunarity = 2.0;
    float land_amplitude = 0.0005;
    float land_frequency = 256.0;
    float ocean_amplitude = 0.5;
    float ocean_frequency = 1.0;

#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        HEMAN_FLOAT* dst = result->data + y * width;
        for (int x = 0; x < width; x++) {
            HEMAN_FLOAT z = *heman_image_texel(img, x, y);
            if (z > 0 && mode == 1) {
                float s = x * inv;
                float t = y * inv;
                float a = land_amplitude;
                float f = land_frequency;
                for (int i = 0; i < octaves; i++) {
                    z += NOISEX(s, t, a, f);
                    a *= gain;
                    f *= lacunarity;
                }
            } else if (z <= 0 && mode == -1) {
                z = MAX(z, -0.1);
                float soften = fabsf(z);
                float s = x * inv;
                float t = y * inv;
                float a = ocean_amplitude;
                float f = ocean_frequency;
                for (int i = 0; i < octaves; i++) {
                    z += soften * NOISEX(s, t, a, f);
                    a *= gain;
                    f *= lacunarity;
                }
            }
            *dst++ = z;
        }
    }

    open_simplex_noise_free(ctx);
    return result;
}
