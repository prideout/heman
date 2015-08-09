#include <islandman.h>
#include <stdlib.h>
#include <time.h>
#include "stb.h"

static const int SIZE = 2048;

#define COUNT(a) (sizeof(a) / sizeof(a[0]))

double omp_get_wtime();
int omp_get_max_threads();

static void write_image(const char* filename, iman_image_t* img)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    iman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    iman_image_as_uchar(img, -1.0, 1.0, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

static void write_colors(const char* filename, iman_image_t* img)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    iman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    iman_image_as_uchar(img, 0.0, 1.0, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

static void test_noise()
{
    printf("Generating noise.\n");
    double begin = omp_get_wtime();
    iman_image_t* img = iman_generate_island_noise(SIZE, SIZE, 7000);
    double duration = omp_get_wtime() - begin;
    printf("Noise generated in %.3f seconds.\n", duration);
    iman_image_destroy(img);
}

static iman_image_t* draw_circle()
{
    iman_image_t* img = iman_image_create(SIZE, SIZE, 1);
    float inv = 1.0f / SIZE;

#pragma omp parallel for
    for (int y = 0; y < SIZE; ++y) {
        float v = y * inv;
        float dv2 = (v - 0.5f) * (v - 0.5f);
        float* dst = iman_image_data(img) + y * SIZE;
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
    iman_image_t* img = draw_circle();
    double begin = omp_get_wtime();
    iman_image_t* sdf = iman_create_distance_field(img);
    double duration = omp_get_wtime() - begin;
    printf("Distance field generated in %.3f seconds.\n", duration);
    write_image("distance.png", sdf);
    iman_image_destroy(img);
    iman_image_destroy(sdf);
}

static void test_island()
{
    srand(time(0));
    iman_image_t* img = iman_create_island_heightmap(SIZE, SIZE, rand());
    write_image("heightmap.png", img);
    iman_image_destroy(img);
}

static void test_color1()
{
    int cp_locations[] = {
        000, 255,
    };
    int cp_colors[] = {
        0xFF0000, 0x00FF00,
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    iman_image_t* grad = iman_create_color_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    const char* filename = "gradient.png";
    printf("Writing to \"%s\".\n", filename);
    unsigned char* bytes = malloc(256 * 3);
    unsigned char* resized = malloc(256 * 256 * 3);
    iman_image_as_uchar(grad, 0.0, 1.0, bytes);
    stbir_resize_uint8(bytes, 256, 1, 0, resized, 256, 256, 0, 3);
    stbi_write_png(filename, 256, 256, 3, resized, 256 * 3);
    free(bytes);
    free(resized);

    iman_image_destroy(grad);
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
    int cp_colors[] = {
        0x001070,  // Dark Blue
        0x0C3A6C,  // Light Blue
        0xC0D0B0,  // Yellow
        0x4D842C,  // Dark Green
        0x505001,  // Brown
        0xFFFFFF,  // White
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    iman_image_t* grad = iman_create_color_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
    iman_image_t* hmap = iman_create_island_heightmap(SIZE, SIZE, rand());
    iman_image_t* albedo = iman_apply_color_gradient(hmap, -0.5, 0.5, grad);
    write_colors("albedo.png", albedo);
    iman_image_destroy(grad);
    iman_image_destroy(hmap);
}

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    test_noise();
    test_distance();
    test_island();
    test_color1();
    test_color2();
}
