#include <heman.h>
#include <stdlib.h>
#include <time.h>
#include "stb.h"

static const int SIZE = 1024;

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
    heman_image_normalize(img, -1.0, 1.0, bytes);
    stbi_write_png(filename, width, height, ncomp, bytes, width * ncomp);
    free(bytes);
}

static void write_colors(const char* filename, heman_image_t* img)
{
    printf("Writing to \"%s\".\n", filename);
    int width, height, ncomp;
    heman_image_info(img, &width, &height, &ncomp);
    unsigned char* bytes = malloc(width * height * ncomp);
    heman_image_normalize(img, 0.0, 1.0, bytes);
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

static void test_color()
{
    int cp_locations[] = {
        000, 255,
    };
    heman_color cp_colors[] = {
        0xFF0000, 0x00FF00,
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image_t* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    const char* filename = OUTFOLDER "gradient.png";
    printf("Writing to \"%s\".\n", filename);
    unsigned char* bytes = malloc(256 * 3);
    unsigned char* resized = malloc(256 * 256 * 3);
    heman_image_normalize(grad, 0.0, 1.0, bytes);
    stbir_resize_uint8(bytes, 256, 1, 0, resized, 256, 256, 0, 3);
    stbi_write_png(filename, 256, 256, 3, resized, 256 * 3);
    free(bytes);
    free(resized);

    heman_image_destroy(grad);
}

static void test_lighting()
{
    // Create a reasonable ocean-to-land color gradient.
    int cp_locations[] = {
        000,  // Dark Blue
        126,  // Light Blue
        127,  // Yellow
        128,  // Dark Green
        150,  // Brown
        255,  // White
    };
    heman_color cp_colors[] = {
        0x001070,  // Dark Blue
        0x2C5A7C,  // Light Blue
        0xE0F0C0,  // Yellow
        0x5D943C,  // Dark Green
        0x606011,  // Brown
        0xFFFFFF,  // White
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image_t* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    // Generate the heightmap.
    srand(time(0));
    heman_image_t* hmap = heman_island_create_heightmap(SIZE, SIZE, rand());
    write_image(OUTFOLDER "heightmap.png", hmap);

    // Compute ambient occlusion.
    heman_image_t* occ = heman_lighting_compute_occlusion(hmap);
    write_image(OUTFOLDER "occlusion.png", occ);
    heman_image_destroy(occ);

    // Create a normal map.
    heman_image_t* norm = heman_lighting_compute_normals(hmap);
    write_image(OUTFOLDER "normals.png", norm);
    heman_image_destroy(norm);

    // Create an albedo image.
    heman_image_t* albedo = heman_color_apply_gradient(hmap, -0.5, 0.5, grad);
    heman_image_destroy(grad);
    write_colors(OUTFOLDER "albedo.png", albedo);

    // Perform lighting.
    float lightpos[] = {-0.5f, 0.5f, 1.0f};
    heman_image_t* final =
        heman_lighting_apply(hmap, albedo, 1, 1, 0.5, lightpos);
    write_colors(OUTFOLDER "final.png", final);

    heman_image_destroy(albedo);
    heman_image_destroy(final);
    heman_image_destroy(hmap);
}

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    test_noise();
    test_distance();
    test_color();
    test_lighting();
}
