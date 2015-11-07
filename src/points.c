#include "image.h"
#include <stdlib.h>
#include <memory.h>
#include <assert.h>
#include <limits.h>
#include <kazmath/vec2.h>

// Transforms even the sequence 0,1,2,3,... into reasonably good random numbers.
inline unsigned int randhash(unsigned int seed)
{
    unsigned int i = (seed ^ 12345391u) * 2654435769u;
    i ^= (i << 6) ^ (i >> 26);
    i *= 2654435769u;
    i += (i << 5) ^ (i >> 12);
    return i;
}

inline float randhashf(unsigned int seed, float a, float b)
{
    return (b - a) * randhash(seed) / (float) UINT_MAX + a;
}

heman_image* heman_points_create(HEMAN_FLOAT* xy, int npoints, int nbands)
{
    heman_points* img = malloc(sizeof(heman_image));
    img->width = npoints;
    img->height = 1;
    img->nbands = nbands;
    int nbytes = sizeof(HEMAN_FLOAT) * npoints * nbands;
    img->data = malloc(nbytes);
    memcpy(img->data, xy, nbytes);
    return img;
}

void heman_points_destroy(heman_points* img)
{
    free(img->data);
    free(img);
}

heman_points* heman_points_from_grid(HEMAN_FLOAT width, HEMAN_FLOAT height,
    HEMAN_FLOAT cellsize, HEMAN_FLOAT jitter)
{
    int cols = width / cellsize;
    int rows = height / cellsize;
    int ncells = cols * rows;
    heman_points* result = heman_image_create(ncells, 1, 2);
    HEMAN_FLOAT rscale = 2.0 * jitter / (HEMAN_FLOAT) RAND_MAX;

// TODO it would be good to avoid ANSI rand() and add some determinism
// in a thread-safe way.  Maybe we should add a seed argument and use
// Bridson's randhash?

#pragma omp parallel for
    for (int j = 0; j < rows; j++) {
        HEMAN_FLOAT* dst = result->data + j * cols * 2;
        HEMAN_FLOAT y = cellsize * 0.5 + cellsize * j;
        HEMAN_FLOAT x = cellsize * 0.5;
        for (int i = 0; i < cols; i++) {
            HEMAN_FLOAT rx = rand() * rscale - jitter;
            HEMAN_FLOAT ry = rand() * rscale - jitter;
            *dst++ = x + rx;
            *dst++ = y + ry;
            x += cellsize;
        }
    }

    return result;
}

kmVec2 sample_annulus(float radius, kmVec2 center, unsigned int* seedptr)
{
    unsigned int seed = *seedptr;
    kmVec2 r;
    float rscale = 1.0f / UINT_MAX;
    while (1) {
        r.x = 4 * rscale * randhash(seed++) - 2;
        r.y = 4 * rscale * randhash(seed++) - 2;
        float r2 = kmVec2LengthSq(&r);
        if (r2 > 1 && r2 <= 4) {
            break;
        }
    }
    *seedptr = seed;
    kmVec2Scale(&r, &r, radius);
    kmVec2Add(&r, &r, &center);
    return r;
}

#define GRIDF(vec) \
    grid[(int) (vec.x * invcell) + ncols * (int) (vec.y * invcell)]

#define GRIDI(vec) grid[(int) vec.y * ncols + (int) vec.x]

heman_points* heman_points_from_poisson(
    HEMAN_FLOAT width, HEMAN_FLOAT height, HEMAN_FLOAT radius)
{
    int maxattempts = 30;
    float rscale = 1.0f / UINT_MAX;
    unsigned int seed = 0;
    kmVec2 rvec;
    rvec.x = rvec.y = radius;
    float r2 = radius * radius;

    // Acceleration grid.
    float cellsize = radius / sqrtf(2);
    float invcell = 1.0f / cellsize;
    int ncols = ceil(width * invcell);
    int nrows = ceil(height * invcell);
    int maxcol = ncols - 1;
    int maxrow = nrows - 1;
    int ncells = ncols * nrows;
    int* grid = malloc(ncells * sizeof(int));
    for (int i = 0; i < ncells; i++) {
        grid[i] = -1;
    }

    // Active list and resulting sample list.
    int* actives = malloc(ncells * sizeof(int));
    int nactives = 0;
    heman_points* result = heman_image_create(ncells, 1, 2);
    kmVec2* samples = (kmVec2*) result->data;
    int nsamples = 0;

    // First sample.
    kmVec2 pt;
    pt.x = width * randhash(seed++) * rscale;
    pt.y = height * randhash(seed++) * rscale;
    GRIDF(pt) = actives[nactives++] = nsamples;
    samples[nsamples++] = pt;

    while (nsamples < ncells) {
        int aindex = MIN(randhashf(seed++, 0, nactives), nactives - 1);
        int sindex = actives[aindex];
        int found = 0;
        kmVec2 j, minj, maxj, delta;
        int attempt;
        for (attempt = 0; attempt < maxattempts && !found; attempt++) {
            pt = sample_annulus(radius, samples[sindex], &seed);

            // Check that this sample is within bounds.
            if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) {
                continue;
            }

            // Test proximity to nearby samples.
            minj = maxj = pt;
            kmVec2Add(&maxj, &maxj, &rvec);
            kmVec2Subtract(&minj, &minj, &rvec);
            kmVec2Scale(&minj, &minj, invcell);
            kmVec2Scale(&maxj, &maxj, invcell);
            minj.x = CLAMP((int) minj.x, 0, maxcol);
            maxj.x = CLAMP((int) maxj.x, 0, maxcol);
            minj.y = CLAMP((int) minj.y, 0, maxrow);
            maxj.y = CLAMP((int) maxj.y, 0, maxrow);
            int reject = 0;
            for (j.y = minj.y; j.y <= maxj.y && !reject; j.y++) {
                for (j.x = minj.x; j.x <= maxj.x && !reject; j.x++) {
                    int entry = GRIDI(j);
                    if (entry > -1 && entry != sindex) {
                        kmVec2Subtract(&delta, &samples[entry], &pt);
                        if (kmVec2LengthSq(&delta) < r2) {
                            reject = 1;
                        }
                    }
                }
            }
            if (reject) {
                continue;
            }
            found = 1;
        }
        if (found) {
            GRIDF(pt) = actives[nactives++] = nsamples;
            samples[nsamples++] = pt;
        } else {
            if (--nactives < 0) {
                break;
            }
            actives[aindex] = actives[nactives];
        }
    }

    // The following line probably isn't necessary.  Paranoia.
    result->width = nsamples;

    free(grid);
    free(actives);
    return result;
}

#undef GRIDF
#undef GRIDI

#define NGRID_INDEX(fpt) \
    ((int) (fpt.x * invcell) + ncols * (int) (fpt.y * invcell))

#define GRID_INDEX(fpt) (gcapacity * NGRID_INDEX(fpt))

#define GRID_INSERT(fpt, sindex)                       \
    gindex = NGRID_INDEX(fpt);                         \
    grid[gcapacity * gindex + ngrid[gindex]] = sindex; \
    ngrid[gindex]++

#define NGRID_BEGIN(ipt) ((int) ipt.y * ncols + (int) ipt.x)

#define GRID_BEGIN(ipt) (NGRID_BEGIN(ipt) * gcapacity)

#define GRID_END(ipt) (GRID_BEGIN(ipt) + ngrid[NGRID_BEGIN(ipt)])

heman_points* heman_points_from_density(
    heman_image* density, HEMAN_FLOAT minradius, HEMAN_FLOAT maxradius)
{
    assert(density->nbands == 1);
    float width = 1;
    float height = density->height / density->width;
    int maxattempts = 30;
    float rscale = 1.0f / UINT_MAX;
    unsigned int seed = 0;
    kmVec2 rvec;
    rvec.x = rvec.y = maxradius;
    int gindex;

    // Acceleration grid.
    float cellsize = maxradius / sqrtf(2);
    float invcell = 1.0f / cellsize;
    int ncols = ceil(width * invcell);
    int nrows = ceil(height * invcell);
    int maxcol = ncols - 1;
    int maxrow = nrows - 1;
    int ncells = ncols * nrows;
    int ntexels = cellsize * density->width;
    int gcapacity = ntexels * ntexels;
    int* grid = malloc(ncells * sizeof(int) * gcapacity);
    int* ngrid = malloc(ncells * sizeof(int));
    for (int i = 0; i < ncells; i++) {
        ngrid[i] = 0;
    }

    // Active list and resulting sample list.
    int* actives = malloc(ncells * sizeof(int));
    int nactives = 0;
    int maxsamples = ncells * gcapacity;
    heman_points* result = heman_image_create(maxsamples, 1, 2);
    kmVec2* samples = (kmVec2*) result->data;
    int nsamples = 0;

    // First sample.
    kmVec2 pt;
    pt.x = width * randhash(seed++) * rscale;
    pt.y = height * randhash(seed++) * rscale;
    actives[nactives++] = nsamples;
    GRID_INSERT(pt, nsamples);
    samples[nsamples++] = pt;

    while (nsamples < maxsamples) {
        int aindex = MIN(randhashf(seed++, 0, nactives), nactives - 1);
        int sindex = actives[aindex];
        int found = 0;
        kmVec2 j, minj, maxj, delta;
        int attempt;
        for (attempt = 0; attempt < maxattempts && !found; attempt++) {
            pt = sample_annulus(maxradius, samples[sindex], &seed);

            // Check that this sample is within bounds.
            if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) {
                continue;
            }

            // Test proximity to nearby samples.
            minj = maxj = pt;
            kmVec2Add(&maxj, &maxj, &rvec);
            kmVec2Subtract(&minj, &minj, &rvec);
            kmVec2Scale(&minj, &minj, invcell);
            kmVec2Scale(&maxj, &maxj, invcell);
            minj.x = CLAMP((int) minj.x, 0, maxcol);
            maxj.x = CLAMP((int) maxj.x, 0, maxcol);
            minj.y = CLAMP((int) minj.y, 0, maxrow);
            maxj.y = CLAMP((int) maxj.y, 0, maxrow);
            int reject = 0;

            HEMAN_FLOAT densityval;
            heman_image_sample(density, pt.x, pt.y, &densityval);

            // The following square root seems to lead to more satisfying
            // results, although we should perhaps let the client decide...
            densityval = sqrt(densityval);

            float mindist = maxradius - densityval * (maxradius - minradius);
            float r2 = mindist * mindist;

            for (j.y = minj.y; j.y <= maxj.y && !reject; j.y++) {
                for (j.x = minj.x; j.x <= maxj.x && !reject; j.x++) {
                    for (int g = GRID_BEGIN(j); g < GRID_END(j); ++g) {
                        int entry = grid[g];
                        if (entry != sindex) {
                            kmVec2Subtract(&delta, &samples[entry], &pt);
                            if (kmVec2LengthSq(&delta) < r2) {
                                reject = 1;
                            }
                        }
                    }
                }
            }
            if (reject) {
                continue;
            }
            found = 1;
        }
        if (found && ngrid[NGRID_INDEX(pt)] >= gcapacity) {
            found = 0;
        }
        if (found) {
            actives[nactives++] = nsamples;
            GRID_INSERT(pt, nsamples);
            samples[nsamples++] = pt;
        } else {
            if (--nactives < 0) {
                break;
            }
            actives[aindex] = actives[nactives];
        }
    }

    // We don't usually fill the pre-allocated buffer, since it was
    // allocated for the worst case, so adjust the size:
    result->width = nsamples;

    free(grid);
    free(ngrid);
    free(actives);
    return result;
}
