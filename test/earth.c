#include <heman.h>
#include <time.h>
#include <omp.h>
#include "stb.h"

#define COUNT(a) (sizeof(a) / sizeof(a[0]))
#define OUTFOLDER "build/"
#define INFOLDER "test/"

heman_image* heman_ops_sweep(heman_image* hmap);

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());

#if 0
    heman_image* grad = read_image(INFOLDER "earthGradient.png", 3);
#else
    int cp_locations[] = {
        000, 155, 156, 200, 255,
    };
    heman_color cp_colors[] = {
        0x001070,  // Dark Blue
        0x2C5A7C,  // Light Blue
        0x5D943C,  // Dark Green
        0x606011,  // Brown
        0xFFFFFF,  // White
    };
    assert(COUNT(cp_locations) == COUNT(cp_colors));
    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
#endif

    double begin = omp_get_wtime();
    heman_image* hmap = read_image(INFOLDER "earth2048.png", 1);
    heman_image* colorized = heman_color_apply_gradient(hmap, 0, 1, grad);
    write_colors(OUTFOLDER "colorized.png", colorized);
    heman_image_destroy(grad);

    float lightpos[] = {-0.5f, 0.5f, 1.0f};
    heman_image* litearth =
        heman_lighting_apply(hmap, colorized, 1, 0.5, 0.5, lightpos);
    write_colors(OUTFOLDER "litearth.png", litearth);
    heman_image_destroy(litearth);
    heman_image_destroy(colorized);

    heman_image* masked = heman_ops_step(hmap, 0.61);
    write_colors(OUTFOLDER "masked.png", masked);
    heman_image* sweep = heman_ops_sweep(masked);
    write_colors(OUTFOLDER "sweep.png", sweep);
    heman_image_destroy(sweep);
    heman_image_destroy(masked);

    heman_image_destroy(hmap);
    double duration = omp_get_wtime() - begin;
    printf("Processed in %.3f seconds.\n", duration);
}
