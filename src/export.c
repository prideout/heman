#include "image.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

void heman_export_ply(heman_image* img, const char* filename)
{
    assert(img->nbands == 1);
    FILE* fout = fopen(filename, "wb");
    int ncols = (img->width - 1);
    int nrows = (img->height - 1);
    int ncells = ncols * nrows;
    int nverts = img->width * img->height;
    fprintf(fout,
        "ply\n"
        "format ascii 1.0\n"  // binary_little_endian 1.0\n"
        "comment heman\n"
        "element vertex %d\n"
        "property float32 x\n"
        "property float32 y\n"
        "property float32 z\n"
        "element face %d\n"
        "property list int32 int32 vertex_indices\n"
        "end_header\n",
        nverts, ncells);
    float invw = 2.0f / img->width;
    float invh = 2.0f / img->height;
    for (int j = 0; j < img->height; j++) {
        for (int i = 0; i < img->width; i++) {
            float x = -1 + i * invw;
            float y = -1 + j * invh;
            float z = *heman_image_texel(img, i, j);
            fprintf(fout, "%f %f %f\n", x, y, z);
        }
    }
    for (int j = 0; j < nrows; j++) {
        int p = j * img->width;
        for (int i = 0; i < ncols; i++, p++) {
            fprintf(fout, "4 %d %d %d %d\n", p, p + 1, p + img->width + 1,
                p + img->width);
        }
    }
    fclose(fout);
}

void heman_export_with_colors_ply(
    heman_image* hmap, heman_image* colors, const char* filename)
{
    int width = hmap->width;
    int height = hmap->height;
    assert(hmap->nbands == 1);
    assert(colors->nbands == 3);
    assert(colors->width == width);
    assert(colors->height == height);
    FILE* fout = fopen(filename, "wb");
    int ncols = (hmap->width - 1);
    int nrows = (hmap->height - 1);
    int ncells = ncols * nrows;
    int nverts = hmap->width * hmap->height;
    unsigned char* colordata = malloc(width * height * 3);
    heman_image_normalize_u8(colors, 0.0, 1.0, colordata);
    fprintf(fout,
        "ply\n"
        "format ascii 1.0\n"  // binary_little_endian 1.0\n"
        "comment heman\n"
        "element vertex %d\n"
        "property float32 x\n"
        "property float32 y\n"
        "property float32 z\n"
        "property uchar red\n"
        "property uchar green\n"
        "property uchar blue\n"
        "property uchar alpha\n"
        "element face %d\n"
        "property list int32 int32 vertex_indices\n"
        "end_header\n",
        nverts, ncells);
    float invw = 2.0f / width;
    float invh = 2.0f / height;
    heman_byte* pcolor = colordata;
    for (int j = 0; j < height; j++) {
        for (int i = 0; i < width; i++) {
            float x = -1 + i * invw;
            float y = -1 + j * invh;
            float z = *heman_image_texel(hmap, i, j);
            int r = *pcolor++;
            int g = *pcolor++;
            int b = *pcolor++;
            fprintf(fout, "%f %f %f %d %d %d 255\n", x, y, z, r, g, b);
        }
    }
    for (int j = 0; j < nrows; j++) {
        int p = j * width;
        for (int i = 0; i < ncols; i++, p++) {
            fprintf(fout, "4 %d %d %d %d\n", p, p + 1, p + hmap->width + 1,
                p + hmap->width);
        }
    }
    fclose(fout);
    free(colordata);
}
