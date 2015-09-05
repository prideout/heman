#include <heman.h>
#include <omp.h>
#include <time.h>
#include "hut.h"

static const int SIZE = 512;

#define COUNT(a) (sizeof(a) / sizeof(a[0]))
#define OUTFOLDER "build/"

static void test_noise()
{
    printf("Generating noise.\n");
    double begin = omp_get_wtime();
    float frequency = 4;
    float amplitude = 1;
    int octaves = 10;
    float lacunarity = 2;
    float gain = 0.65f;
    int seed = 5000;
    heman_image* img = heman_generate_simplex_fbm(
        SIZE, SIZE, frequency, amplitude, octaves, lacunarity, gain, seed);
    double duration = omp_get_wtime() - begin;
    printf("Noise generated in %.3f seconds.\n", duration);
    hut_write_image(OUTFOLDER "noise.png", img, -1, 1);
    heman_image_destroy(img);
}

static heman_image* draw_circle()
{
    heman_image* img = heman_image_create(SIZE, SIZE, 1);
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
    heman_image* img = draw_circle();
    double begin = omp_get_wtime();
    heman_image* sdf = heman_distance_create_sdf(img);
    double duration = omp_get_wtime() - begin;
    printf("Distance field generated in %.3f seconds.\n", duration);
    hut_write_image(OUTFOLDER "distance.png", sdf, -1, 1);
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
    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    const char* filename = OUTFOLDER "gradient.png";
    printf("Writing to \"%s\".\n", filename);
    unsigned char* bytes = malloc(256 * 3);
    unsigned char* resized = malloc(256 * 256 * 3);
    heman_export_u8(grad, 0.0, 1.0, bytes);
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
        160,  // Brown
        200,  // White
        255,  // White
    };
    heman_color cp_colors[] = {
        0x001070,  // Dark Blue
        0x2C5A7C,  // Light Blue
        0xE0F0A0,  // Yellow
        0x5D943C,  // Dark Green
        0x606011,  // Brown
        0xFFFFFF,  // White
        0xFFFFFF,  // White
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);

    // Generate the heightmap.
    heman_image* hmap = heman_generate_island_heightmap(SIZE, SIZE, time(0));
    heman_image* hmapviz = heman_ops_normalize_f32(hmap, -0.5, 0.5);

    // Compute ambient occlusion.
    heman_image* occ = heman_lighting_compute_occlusion(hmap);

    // Create a normal map.
    heman_image* norm = heman_lighting_compute_normals(hmap);
    heman_image* normviz = heman_ops_normalize_f32(norm, -1, 1);

    // Create an albedo image.
    heman_image* albedo = heman_color_apply_gradient(hmap, -0.5, 0.5, grad);
    heman_image_destroy(grad);

    // Perform lighting.
    float lightpos[] = {-0.5f, 0.5f, 1.0f};
    heman_image* final =
        heman_lighting_apply(hmap, albedo, 1, 1, 0.5, lightpos);

    heman_image* frames[] = {0, 0, normviz, albedo, final};
    frames[0] = heman_color_from_grayscale(hmapviz);
    frames[1] = heman_color_from_grayscale(occ);
    heman_image* filmstrip = heman_ops_stitch_horizontal(frames, 5);
    hut_write_image(OUTFOLDER "filmstrip.png", filmstrip, 0, 1);
    heman_export_ply(hmap, OUTFOLDER "heightmap.ply");
    heman_export_with_colors_ply(hmap, final, OUTFOLDER "colors.ply");
    heman_image_destroy(frames[0]);
    heman_image_destroy(frames[1]);
    heman_image_destroy(hmap);
    heman_image_destroy(hmapviz);
    heman_image_destroy(occ);
    heman_image_destroy(norm);
    heman_image_destroy(normviz);
    heman_image_destroy(albedo);
    heman_image_destroy(final);
}

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    test_noise();
    test_distance();
    test_color();
    test_lighting();
}
