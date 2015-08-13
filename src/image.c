#include "image.h"
#include <stdlib.h>
#include <math.h>

float _gamma = 2.2f;

float* heman_image_data(heman_image* img) { return img->data; }

void heman_image_set_gamma(float g) { _gamma = g; }

void heman_image_info(heman_image* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

float* heman_imageexel(heman_image* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

heman_image* heman_image_create(int width, int height, int nbands)
{
    heman_image* img = malloc(sizeof(heman_image));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(float) * width * height * nbands);
    return img;
}

void heman_image_destroy(heman_image* img)
{
    free(img->data);
    free(img);
}

void heman_image_normalize(
    heman_image* source, float minv, float maxv, heman_byte* outp)
{
    const float* inp = source->data;
    float scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        *outp++ = 255 * (*inp++ - minv) * scale;
    }
}

void heman_image_sample(heman_image* img, float u, float v, float* result)
{
    int x = img->width * fmod(1.0f + u, 1.0f);
    int y = img->height * fmod(1.0f + v, 1.0f);
    float* data = heman_imageexel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}
