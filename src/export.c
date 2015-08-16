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
        "format binary_little_endian 1.0\n"
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
    float vert[3];
    for (int j = 0; j < img->height; j++) {
        for (int i = 0; i < img->width; i++) {
            vert[0] = -1 + i * invw;
            vert[1] = -1 + j * invh;
            vert[2] = *heman_image_texel(img, i, j);
            fwrite(vert, sizeof(vert), 1, fout);
        }
    }
    int face[5];
    face[0] = 4;
    for (int j = 0; j < nrows; j++) {
        int p = j * img->width;
        for (int i = 0; i < ncols; i++, p++) {
            face[1] = p;
            face[2] = p + 1;
            face[3] = p + img->width + 1;
            face[4] = p + img->width;
            fwrite(face, sizeof(face), 1, fout);
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
    heman_export_u8(colors, 0.0, 1.0, colordata);
    fprintf(fout,
        "ply\n"
        "format binary_little_endian 1.0\n"
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
    float vert[3];
    for (int j = 0; j < height; j++) {
        for (int i = 0; i < width; i++) {
            vert[0] = -1 + i * invw;
            vert[1] = -1 + j * invh;
            vert[2] = *heman_image_texel(hmap, i, j);
            fwrite(vert, sizeof(vert), 1, fout);
            fwrite(pcolor, 3, 1, fout);
            pcolor += 3;
            fputc(255, fout);
        }
    }
    int face[5];
    face[0] = 4;
    for (int j = 0; j < nrows; j++) {
        int p = j * width;
        for (int i = 0; i < ncols; i++, p++) {
            face[1] = p;
            face[2] = p + 1;
            face[3] = p + hmap->width + 1;
            face[4] = p + hmap->width;
            fwrite(face, sizeof(face), 1, fout);
        }
    }
    fclose(fout);
    free(colordata);
}

void heman_export_u8(
    heman_image* source, HEMAN_FLOAT minv, HEMAN_FLOAT maxv, heman_byte* outp)
{
    const HEMAN_FLOAT* inp = source->data;
    HEMAN_FLOAT scale = 1.0f / (maxv - minv);
    int size = source->height * source->width * source->nbands;
    for (int i = 0; i < size; ++i) {
        HEMAN_FLOAT v = 255 * (*inp++ - minv) * scale;
        *outp++ = CLAMP(v, 0, 255);
    }
}
