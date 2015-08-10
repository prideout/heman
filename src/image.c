#include "image.h"
#include <stdlib.h>
#include <math.h>

float _gamma = 2.2f;

float* heman_image_data(heman_image_t* img) { return img->data; }

void heman_image_set_gamma(float g) { _gamma = g; }

void heman_image_info(heman_image_t* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

float* heman_image_texel(heman_image_t* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

heman_image_t* heman_image_create(int width, int height, int nbands)
{
    heman_image_t* img = malloc(sizeof(heman_image_t));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(float) * width * height * nbands);
    return img;
}

void heman_image_destroy(heman_image_t* img)
{
    free(img->data);
    free(img);
}

void heman_image_as_uchar(
    heman_image_t* img, float minv, float maxv, unsigned char* dst)
{
    float* src = img->data;
    float scale = 1.0f / (maxv - minv);
    int size = img->height * img->width * img->nbands;
    for (int i = 0; i < size; ++i) {
        *dst++ = 255 * (*src++ - minv) * scale;
    }
}

void heman_image_sample(heman_image_t* img, float u, float v, float* result)
{
    int x = img->width * fmod(1.0f + u, 1.0f);
    int y = img->height * fmod(1.0f + v, 1.0f);
    float* data = heman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}
