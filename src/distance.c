#include "image.h"
#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>

const HEMAN_FLOAT INF = 1E20;

#define SQR(x) ((x) * (x))
#define NEW(t, n) calloc(n, sizeof(t))
#define TEXEL(x, y) (*(img->data + y * width + x))

static void edt(HEMAN_FLOAT* f, HEMAN_FLOAT* d, HEMAN_FLOAT* z, uint16_t* v, uint16_t* w, int n)
{
    int k = 0;
    HEMAN_FLOAT s;
    w[0] = 0;
    z[0] = -INF;
    z[1] = +INF;
    for (int q = 1; q < n; ++q) {
        s = ((f[q] + SQR(q)) - (f[w[k]] + SQR(w[k]))) / (2 * q - 2 * w[k]);
        while (s <= z[k]) {
            --k;
            s = ((f[q] + SQR(q)) - (f[w[k]] + SQR(w[k]))) / (2 * q - 2 * w[k]);
        }
        w[++k] = q;
        z[k] = s;
        z[k + 1] = +INF;
    }
    k = 0;
    for (int q = 0; q < n; ++q) {
        while (z[k + 1] < q) {
            ++k;
        }
        d[q] = SQR(q - w[k]) + f[w[k]];
        v[q] = w[k];
    }
}

static void transform_to_distance(heman_image* img)
{
    int width = img->width;
    int height = img->height;
    int size = width * height;
    HEMAN_FLOAT* ff = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* dd = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* zz = NEW(HEMAN_FLOAT, (height + 1) * (width + 1));
    uint16_t* vv = NEW(uint16_t, size);
    uint16_t* ww = NEW(uint16_t, size);

#pragma omp parallel for
    for (int x = 0; x < width; ++x) {
        HEMAN_FLOAT* f = ff + height * x;
        HEMAN_FLOAT* d = dd + height * x;
        HEMAN_FLOAT* z = zz + (height + 1) * x;
        uint16_t* v = vv + height * x;
        uint16_t* w = ww + height * x;
        for (int y = 0; y < height; ++y) {
            f[y] = TEXEL(x, y);
        }
        edt(f, d, z, v, w, height);
        for (int y = 0; y < height; ++y) {
            TEXEL(x, y) = d[y];
        }
    }

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* f = ff + width * y;
        HEMAN_FLOAT* d = dd + width * y;
        HEMAN_FLOAT* z = zz + (width + 1) * y;
        uint16_t* v = vv + width * y;
        uint16_t* w = ww + width * y;
        for (int x = 0; x < width; ++x) {
            f[x] = TEXEL(x, y);
        }
        edt(f, d, z, v, w, width);
        for (int x = 0; x < width; ++x) {
            TEXEL(x, y) = d[x];
        }
    }

    free(ff);
    free(dd);
    free(zz);
    free(vv);
    free(ww);
}

heman_image* heman_distance_create_sdf(heman_image* src)
{
    assert(src->nbands == 1 && "Distance field input must have only 1 band.");
    heman_image* positive = heman_image_create(src->width, src->height, 1);
    heman_image* negative = heman_image_create(src->width, src->height, 1);
    int size = src->height * src->width;
    HEMAN_FLOAT* pptr = positive->data;
    HEMAN_FLOAT* nptr = negative->data;
    HEMAN_FLOAT* sptr = src->data;
    for (int i = 0; i < size; ++i, ++sptr) {
        *pptr++ = *sptr ? INF : 0;
        *nptr++ = *sptr ? 0 : INF;
    }
    transform_to_distance(positive);
    transform_to_distance(negative);
    HEMAN_FLOAT inv = 1.0f / src->width;
    pptr = positive->data;
    nptr = negative->data;
    for (int i = 0; i < size; ++i, ++pptr, ++nptr) {
        *pptr = (sqrt(*pptr) - sqrt(*nptr)) * inv;
    }
    heman_image_destroy(negative);
    return positive;
}
