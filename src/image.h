#pragma once
#include <heman.h>

struct heman_image_s {
    int width;
    int height;
    int nbands;
    float* data;
};

extern float _gamma;
