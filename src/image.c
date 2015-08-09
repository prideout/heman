#include "image.h"
#include <stdlib.h>

float _gamma = 2.2f;

float* iman_image_data(iman_image_t* img) { return img->data; }

void iman_image_set_gamma(float g) { _gamma = g; }

void iman_image_info(iman_image_t* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

float* iman_image_texel(iman_image_t* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

iman_image_t* iman_image_create(int width, int height, int nbands)
{
    iman_image_t* img = malloc(sizeof(iman_image_t));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(float) * width * height * nbands);
    return img;
}

void iman_image_destroy(iman_image_t* img)
{
    free(img->data);
    free(img);
}

void iman_image_as_uchar(
    iman_image_t* img, float minv, float maxv, unsigned char* dst)
{
    float* src = img->data;
    float scale = 1.0f / (maxv - minv);
    int size = img->height * img->width * img->nbands;
    for (int i = 0; i < size; ++i) {
        *dst++ = 255 * (*src++ - minv) * scale;
    }
}
