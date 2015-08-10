#include <heman.h>
#include <stdlib.h>
#include <time.h>
#include "stb.h"

static const int SIZE = 2048;

#define COUNT(a) (sizeof(a) / sizeof(a[0]))
#define OUTFOLDER "build/"

double omp_get_wtime();
int omp_get_max_threads();

static void write_image(const char* filename, heman_image_t* img)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    heman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    heman_image_as_uchar(img, -1.0, 1.0, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

static void write_colors(const char* filename, heman_image_t* img)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    heman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    heman_image_as_uchar(img, 0.0, 1.0, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

static void test_noise()
{
    printf("Generating noise.\n");
    double begin = omp_get_wtime();
    heman_image_t* img = heman_island_generate_noise(SIZE, SIZE, 7000);
    double duration = omp_get_wtime() - begin;
    printf("Noise generated in %.3f seconds.\n", duration);
    heman_image_destroy(img);
}

static heman_image_t* draw_circle()
{
    heman_image_t* img = heman_image_create(SIZE, SIZE, 1);
    float inv = 1.0f / SIZE;

#pragma omp parallel for
    for (int y = 0; y < SIZE; ++y) {
        float v = y * inv;
        float dv2 = (v - 0.5f) * (v - 0.5f);
        float* dst = heman_image_data(img) + y * SIZE;
        for (int x = 0; x < SIZE; ++x) {
            float u = x * inv;
            float du2 = (u - 0.5f) * (u - 0.5f);
            *dst++ = du2 + dv2 < 0.0625f ? 1 : 0;
        }
    }
    return img;
}

static void test_distance()
{
    heman_image_t* img = draw_circle();
    double begin = omp_get_wtime();
    heman_image_t* sdf = heman_distance_create_sdf(img);
    double duration = omp_get_wtime() - begin;
    printf("Distance field generated in %.3f seconds.\n", duration);
    write_image(OUTFOLDER "distance.png", sdf);
    heman_image_destroy(img);
    heman_image_destroy(sdf);
}

static void test_island()
{
    srand(time(0));
    heman_image_t* img = heman_island_create_heightmap(SIZE, SIZE, rand());
    write_image(OUTFOLDER "heightmap.png", img);
    heman_image_destroy(img);
}

static void test_color1()
{
    int cp_locations[] = {
        000, 255,
    };
    uint32_t cp_colors[] = {
        0xFF0000, 0x00FF00,
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image_t* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    const char* filename = OUTFOLDER "gradient.png";
    printf("Writing to \"%s\".\n", filename);
    unsigned char* bytes = malloc(256 * 3);
    unsigned char* resized = malloc(256 * 256 * 3);
    heman_image_as_uchar(grad, 0.0, 1.0, bytes);
    stbir_resize_uint8(bytes, 256, 1, 0, resized, 256, 256, 0, 3);
    stbi_write_png(filename, 256, 256, 3, resized, 256 * 3);
    free(bytes);
    free(resized);

    heman_image_destroy(grad);
}

static void test_color2()
{
    int cp_locations[] = {
        000,  // Dark Blue
        126,  // Light Blue
        127,  // Yellow
        128,  // Dark Green
        150,  // Brown
        255,  // White
    };
    uint32_t cp_colors[] = {
        0x001070,  // Dark Blue
        0x0C3A6C,  // Light Blue
        0xC0D0B0,  // Yellow
        0x4D842C,  // Dark Green
        0x505001,  // Brown
        0xFFFFFF,  // White
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image_t* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
    heman_image_t* hmap = heman_island_create_heightmap(SIZE, SIZE, rand());
    heman_image_t* albedo = heman_color_apply_gradient(hmap, -0.5, 0.5, grad);
    write_colors(OUTFOLDER "albedo.png", albedo);
    heman_image_destroy(grad);
    heman_image_destroy(hmap);
}

static void test_lighting()
{
    heman_image_t* elev = heman_island_create_heightmap(SIZE, SIZE, rand());
    heman_image_t* norm = heman_lighting_compute_normals(elev);
    // TODO
    heman_image_destroy(elev);
    heman_image_destroy(norm);
}

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    test_noise();
    test_distance();
    test_island();
    test_color1();
    test_color2();
    test_lighting();
}
