#include "image.h"
#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>

const HEMAN_FLOAT INF = 1E20;

#define NEW(t, n) calloc(n, sizeof(t))
#define SDISTFIELD_TEXEL(x, y) (*(sdf->data + y * width + x))
#define COORDFIELD_TEXEL(x, y, c) (*(cf->data + 2 * (y * width + x) + c))

static void edt(
    HEMAN_FLOAT* f, HEMAN_FLOAT* d, HEMAN_FLOAT* z, uint16_t* w, int n)
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
    }
}

static void edt_with_payload(HEMAN_FLOAT* f, HEMAN_FLOAT* d, HEMAN_FLOAT* z,
    uint16_t* w, int n, HEMAN_FLOAT* payload_in, HEMAN_FLOAT* payload_out)
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
        payload_out[q * 2] = payload_in[w[k] * 2];
        payload_out[q * 2 + 1] = payload_in[w[k] * 2 + 1];
    }
}

static void transform_to_distance(heman_image* sdf)
{
    int width = sdf->width;
    int height = sdf->height;
    int size = width * height;
    HEMAN_FLOAT* ff = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* dd = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* zz = NEW(HEMAN_FLOAT, (height + 1) * (width + 1));
    uint16_t* ww = NEW(uint16_t, size);

#pragma omp parallel for
    for (int x = 0; x < width; ++x) {
        HEMAN_FLOAT* f = ff + height * x;
        HEMAN_FLOAT* d = dd + height * x;
        HEMAN_FLOAT* z = zz + (height + 1) * x;
        uint16_t* w = ww + height * x;
        for (int y = 0; y < height; ++y) {
            f[y] = SDISTFIELD_TEXEL(x, y);
        }
        edt(f, d, z, w, height);
        for (int y = 0; y < height; ++y) {
            SDISTFIELD_TEXEL(x, y) = d[y];
        }
    }

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* f = ff + width * y;
        HEMAN_FLOAT* d = dd + width * y;
        HEMAN_FLOAT* z = zz + (width + 1) * y;
        uint16_t* w = ww + width * y;
        for (int x = 0; x < width; ++x) {
            f[x] = SDISTFIELD_TEXEL(x, y);
        }
        edt(f, d, z, w, width);
        for (int x = 0; x < width; ++x) {
            SDISTFIELD_TEXEL(x, y) = d[x];
        }
    }

    free(ff);
    free(dd);
    free(zz);
    free(ww);
}

static void transform_to_coordfield(heman_image* sdf, heman_image* cf)
{
    int width = sdf->width;
    int height = sdf->height;
    int size = width * height;
    HEMAN_FLOAT* ff = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* dd = NEW(HEMAN_FLOAT, size);
    HEMAN_FLOAT* zz = NEW(HEMAN_FLOAT, (height + 1) * (width + 1));
    uint16_t* ww = NEW(uint16_t, size);

#pragma omp parallel for
    for (int x = 0; x < width; ++x) {
        HEMAN_FLOAT* pl1 = NEW(HEMAN_FLOAT, height * 2);
        HEMAN_FLOAT* pl2 = NEW(HEMAN_FLOAT, height * 2);
        HEMAN_FLOAT* f = ff + height * x;
        HEMAN_FLOAT* d = dd + height * x;
        HEMAN_FLOAT* z = zz + (height + 1) * x;
        uint16_t* w = ww + height * x;
        for (int y = 0; y < height; ++y) {
            f[y] = SDISTFIELD_TEXEL(x, y);
            pl1[y * 2] = COORDFIELD_TEXEL(x, y, 0);
            pl1[y * 2 + 1] = COORDFIELD_TEXEL(x, y, 1);
        }
        edt_with_payload(f, d, z, w, height, pl1, pl2);
        for (int y = 0; y < height; ++y) {
            SDISTFIELD_TEXEL(x, y) = d[y];
            COORDFIELD_TEXEL(x, y, 0) = pl2[2 * y];
            COORDFIELD_TEXEL(x, y, 1) = pl2[2 * y + 1];
        }
        free(pl1);
        free(pl2);
    }

#pragma omp parallel for
    for (int y = 0; y < height; ++y) {
        HEMAN_FLOAT* pl1 = NEW(HEMAN_FLOAT, width * 2);
        HEMAN_FLOAT* pl2 = NEW(HEMAN_FLOAT, width * 2);
        HEMAN_FLOAT* f = ff + width * y;
        HEMAN_FLOAT* d = dd + width * y;
        HEMAN_FLOAT* z = zz + (width + 1) * y;
        uint16_t* w = ww + width * y;
        for (int x = 0; x < width; ++x) {
            f[x] = SDISTFIELD_TEXEL(x, y);
            pl1[x * 2] = COORDFIELD_TEXEL(x, y, 0);
            pl1[x * 2 + 1] = COORDFIELD_TEXEL(x, y, 1);
        }
        edt_with_payload(f, d, z, w, width, pl1, pl2);
        for (int x = 0; x < width; ++x) {
            SDISTFIELD_TEXEL(x, y) = d[x];
            COORDFIELD_TEXEL(x, y, 0) = pl2[2 * x];
            COORDFIELD_TEXEL(x, y, 1) = pl2[2 * x + 1];
        }
        free(pl1);
        free(pl2);
    }

    free(ff);
    free(dd);
    free(zz);
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

heman_image* heman_distance_create_df(heman_image* src)
{
    assert(src->nbands == 1 && "Distance field input must have only 1 band.");
    heman_image* positive = heman_image_create(src->width, src->height, 1);
    int size = src->height * src->width;
    HEMAN_FLOAT* pptr = positive->data;
    HEMAN_FLOAT* sptr = src->data;
    for (int i = 0; i < size; ++i, ++sptr) {
        *pptr++ = *sptr ? 0 : INF;
    }
    transform_to_distance(positive);
    HEMAN_FLOAT inv = 1.0f / src->width;
    pptr = positive->data;
    for (int i = 0; i < size; ++i, ++pptr) {
        *pptr = sqrt(*pptr) * inv;
    }
    return positive;
}

heman_image* heman_distance_identity_cpcf(int width, int height)
{
    heman_image* retval = heman_image_create(width, height, 2);
    HEMAN_FLOAT* cdata = retval->data;
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            *cdata++ = x;
            *cdata++ = y;
        }
    }
    return retval;
}

heman_image* heman_distance_create_cpcf(heman_image* src)
{
    heman_image* negative = heman_image_create(src->width, src->height, 1);
    int size = src->height * src->width;
    HEMAN_FLOAT* nptr = negative->data;
    HEMAN_FLOAT* sptr = src->data;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT val = 0;
        for (int b = 0; b < src->nbands; ++b) {
            val += *sptr++;
        }
        *nptr++ = val ? 0 : INF;
    }
    heman_image* coordfield = heman_distance_identity_cpcf(src->width, src->height);
    transform_to_coordfield(negative, coordfield);
    heman_image_destroy(negative);
    return coordfield;
}

heman_image* heman_distance_from_cpcf(heman_image* cf)
{
    assert(cf->nbands == 2 && "Coordinate field input must have 2 bands.");
    heman_image* udf = heman_image_create(cf->width, cf->height, 1);
    HEMAN_FLOAT* dptr = udf->data;
    HEMAN_FLOAT* sptr = cf->data;
    HEMAN_FLOAT scale = 1.0f / sqrt(SQR(cf->width) + SQR(cf->height));
    for (int y = 0; y < cf->height; y++) {
        for (int x = 0; x < cf->width; x++) {
            HEMAN_FLOAT u = *sptr++;
            HEMAN_FLOAT v = *sptr++;
            HEMAN_FLOAT dist = sqrt(SQR(u - x) + SQR(v - y)) * scale;
            *dptr++ = dist;
        }
    }
    return udf;
}
