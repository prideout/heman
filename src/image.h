#pragma once
#include <heman.h>

struct heman_image_s {
    int width;
    int height;
    int nbands;
    HEMAN_FLOAT* data;
};

extern HEMAN_FLOAT _gamma;
