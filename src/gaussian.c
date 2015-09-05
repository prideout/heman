#include "image.h"
#include <assert.h>
#include <stdlib.h>

// Compute a particular row in Pascal's triangle.  This can also be used
// to sample the Gaussian function using integers, which is kinda neat!
void generate_gaussian_row(int* target, int fwidth)
{
    assert(fwidth > 0);
    int nbytes = fwidth * sizeof(int);
    int* tmp = malloc(nbytes);
    target[0] = tmp[0] = 1;
    for (int col = 1; col < fwidth; col++) {
        target[col] = 0;
        tmp[col] = 0;
    }
    for (int row = 1; row < fwidth; row++) {
        for (int col = 1; col <= row; col++) {
            target[col] = tmp[col] + tmp[col - 1];
        }
        for (int col = 1; col <= row; col++) {
            tmp[col] = target[col];
        }
    }
    free(tmp);
}

// Fill fwidth * fwidth entries with Gaussian weights.
// The sum of all weights is 1.0.
void generate_gaussian_splat(HEMAN_FLOAT* target, int fwidth)
{
    int* gaussian_row = malloc(fwidth * sizeof(int));
    generate_gaussian_row(gaussian_row, fwidth);
    int shift = 1 << (fwidth - 1);
    HEMAN_FLOAT scale = 1.0 / (shift * shift);
    HEMAN_FLOAT* gptr = target;
    for (int j = 0; j < fwidth; j++) {
        for (int i = 0; i < fwidth; i++) {
            *gptr++ = gaussian_row[i] * gaussian_row[j] * scale;
        }
    }
    free(gaussian_row);
}
