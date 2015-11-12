#include <heman.h>
#include <omp.h>
#include <time.h>
#include <kazmath/vec2.h>
#include <kazmath/vec3.h>
#include "hut.h"

static const int SIZE = 512;

#define COUNT(a) (sizeof(a) / sizeof(a[0]))
#define OUTFOLDER "build/"

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    const int seed = 1;
    const int npts = 5;
    const int res = 4096;

    heman_points* pts = heman_image_create(npts, 1, 3);
    kmVec3* coords = (kmVec3*) heman_image_data(pts);
    coords[0] = (kmVec3){0.3, 0.4, 0.1};
    coords[1] = (kmVec3){0.2, 0.5, 0.1};
    coords[2] = (kmVec3){0.8, 0.7, 0.1};
    coords[3] = (kmVec3){0.8, 0.5, 0.1};
    coords[4] = (kmVec3){0.5, 0.5, 0.2};
    heman_color colors[5] = {0xC8758A, 0xDE935A, 0xE0BB5E, 0xE0BB5E, 0x8EC85D};
    heman_color ocean = 0x83B2B2;
    heman_image* contour = heman_image_create(res, res / 2, 3);
    heman_image_clear(contour, 0);
    heman_draw_contour_from_points(contour, pts, ocean, 0.3, 0.45, 1);
    heman_draw_colored_circles(contour, pts, 20, colors);

    heman_image* cpcf = heman_distance_create_cpcf(contour);
    heman_image* warped = heman_ops_warp(cpcf, seed, 10);
    heman_image* voronoi = heman_color_from_cpcf(warped, contour);
    heman_image* toon = heman_ops_sobel(voronoi, 0x303030);
    hut_write_image(OUTFOLDER "terrainpts.png", voronoi, 0, 1);
    hut_write_image(OUTFOLDER "terrainpts_toon.png", toon, 0, 1);
}
