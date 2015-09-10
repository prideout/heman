// This is a private header.  Clients should not include it.

#pragma once
#include <heman.h>

struct heman_image_s {
    int width;
    int height;
    int nbands;
    HEMAN_FLOAT* data;
};

extern float _gamma;

#define MIN(a, b) (a > b ? b : a)
#define MAX(a, b) (a > b ? a : b)
#define CLAMP(v, lo, hi) MAX(lo, MIN(hi, v))
#define CLAMP01(v) CLAMP(v, 0.0f, 1.0f)
#define SGN(x) ((x > 0) - (x < 0))
#define EDGE(value, upper) MAX(0, MIN(upper - 1, value))
#define TWO_OVER_PI (0.63661977236)
#define PI (3.1415926535)
#define SQR(x) ((x) * (x))

void generate_gaussian_row(int* target, int fwidth);
void generate_gaussian_splat(HEMAN_FLOAT* target, int fwidth);
