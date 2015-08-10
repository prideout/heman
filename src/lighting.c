#include "image.h"
#include <assert.h>

heman_image_t* heman_lighting_compute_normals(heman_image_t* heightmap)
{
    assert(heightmap->nbands == 1);
    int width = heightmap->width;
    int height = heightmap->height;
    heman_image_t* result = heman_image_create(width, height, 3);
    return result;
}
