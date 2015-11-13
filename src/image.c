#include "image.h"
#include <stdlib.h>
#include <math.h>
#include <assert.h>

HEMAN_FLOAT* heman_image_data(heman_image* img) { return img->data; }

void heman_image_array(heman_image* img, HEMAN_FLOAT** data, int* nfloats)
{
    *data = img->data;
    *nfloats = img->width * img->height * img->nbands;
}

void heman_image_info(heman_image* img, int* width, int* height, int* nbands)
{
    *width = img->width;
    *height = img->height;
    *nbands = img->nbands;
}

HEMAN_FLOAT* heman_image_texel(heman_image* img, int x, int y)
{
    return img->data + y * img->width * img->nbands + x * img->nbands;
}

heman_image* heman_image_create(int width, int height, int nbands)
{
    heman_image* img = malloc(sizeof(heman_image));
    img->width = width;
    img->height = height;
    img->nbands = nbands;
    img->data = malloc(sizeof(HEMAN_FLOAT) * width * height * nbands);
    return img;
}

void heman_image_destroy(heman_image* img)
{
    free(img->data);
    free(img);
}

void heman_image_sample(heman_image* img, float u, float v, HEMAN_FLOAT* result)
{
    int x = CLAMP(img->width * u, 0, img->width - 1);
    int y = CLAMP(img->height * v, 0, img->height - 1);
    HEMAN_FLOAT* data = heman_image_texel(img, x, y);
    for (int b = 0; b < img->nbands; ++b) {
        *result++ = *data++;
    }
}

void heman_image_clear(heman_image* img, HEMAN_FLOAT value)
{
    int size = img->width * img->height * img->nbands;
    HEMAN_FLOAT* dst = img->data;
    while (size--) {
        *dst++ = value;
    }
}

heman_image* heman_image_extract_alpha(heman_image* img)
{
    assert(img->nbands == 4);
    heman_image* retval = heman_image_create(img->width, img->height, 1);
    int size = img->width * img->height;
    HEMAN_FLOAT* src = img->data;
    HEMAN_FLOAT* dst = retval->data;
    while (size--) {
        src += 3;
        *dst++ = *src++;
    }
    return retval;
}

heman_image* heman_image_extract_rgb(heman_image* img)
{
    assert(img->nbands == 4);
    heman_image* retval = heman_image_create(img->width, img->height, 3);
    int size = img->width * img->height;
    HEMAN_FLOAT* src = img->data;
    HEMAN_FLOAT* dst = retval->data;
    while (size--) {
        *dst++ = *src++;
        *dst++ = *src++;
        *dst++ = *src++;
        ++src;
    }
    return retval;
}
