#include <heman.h>
#include <time.h>
#include <kazmath/vec2.h>
#include <kazmath/vec3.h>
#include "hut.h"

#ifdef __APPLE__
double omp_get_wtime() { return 1; }
int omp_get_max_threads() { return 1; }
#else
#include <omp.h>
#endif

static const int SIZE = 512;

#define COUNT(a) (sizeof(a) / sizeof(a[0]))
#define OUTFOLDER "build/"

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
        HEMAN_FLOAT* dst = heman_image_data(img) + y * SIZE;
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

    hut_write_image_scaled(OUTFOLDER "gradient.png", grad, 256, 256);
    heman_image_destroy(grad);
}

static void test_lighting()
{
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

static void test_points_grid()
{
    const int imgres = 192;
    const int ptsize = 4;
    const float cellsize = 0.05;
    const float maxjitter = 0.02;
    const float lpos[] = {-0.5f, 0.5f, 1.0f};
    const int cp_locations[] = {0, 126, 255};
    const heman_color cp_colors[] = {0x2C5A7C, 0x2C5A7C, 0xE0F0A0};

    heman_points* points = heman_points_from_grid(1, 1, cellsize, 0);
    heman_image* uniform = heman_image_create(imgres, imgres, 1);
    heman_image_clear(uniform, 0);
    heman_draw_splats(uniform, points, ptsize, 0);
    heman_points_destroy(points);

    points = heman_points_from_grid(1, 1, cellsize, maxjitter);
    heman_image* jittered = heman_image_create(imgres, imgres, 1);
    heman_image_clear(jittered, 0);
    heman_draw_splats(jittered, points, ptsize, 0);
    heman_points_destroy(points);

    points = heman_points_from_poisson(1, 1, cellsize / sqrtf(2));
    heman_image* poisson = heman_image_create(imgres, imgres, 1);
    heman_image_clear(poisson, 0);
    heman_draw_splats(poisson, points, ptsize, 0);
    heman_points_destroy(points);

    heman_image* frames[] = {uniform, jittered, poisson};
    heman_image* elev = heman_ops_stitch_horizontal(frames, 3);
    heman_image_destroy(uniform);
    heman_image_destroy(jittered);
    heman_image_destroy(poisson);

    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
    heman_image* albedo = heman_color_apply_gradient(elev, 0.0, 0.05, grad);
    heman_image* final = heman_lighting_apply(elev, albedo, 1, 1, 0.75, lpos);

    hut_write_image(OUTFOLDER "gridpoints.png", final, 0, 1);
    heman_image_destroy(final);
    heman_image_destroy(grad);
    heman_image_destroy(albedo);
    heman_image_destroy(elev);
}

static void test_points_density()
{
    const int imgres = 256;

    heman_image* density = heman_generate_island_heightmap(imgres, imgres, 1);
    heman_image* tmp = heman_ops_normalize_f32(density, -0.5, 0.5);
    heman_image_destroy(density);
    density = tmp;

    heman_image* curvature = heman_ops_laplacian(density);
    tmp = heman_ops_normalize_f32(curvature, 0, 0.0005);
    heman_image_destroy(curvature);
    curvature = tmp;
    heman_ops_accumulate(curvature, density);

    heman_points* points = heman_points_from_density(curvature, 0.001, 0.03);
    heman_image* modulated = heman_image_create(imgres, imgres, 1);
    heman_image_clear(modulated, 0);
    heman_draw_points(modulated, points, 1);

    heman_image* splats = heman_image_create(imgres, imgres, 1);
    heman_image_clear(splats, 0);
    heman_draw_splats(splats, points, 4, 0);
    splats = heman_ops_normalize_f32(splats, 0, 0.4);
    heman_points_destroy(points);

    heman_image* frames[] = {density, curvature, modulated, splats};
    heman_image* filmstrip = heman_ops_stitch_horizontal(frames, 4);
    heman_image_destroy(density);
    heman_image_destroy(curvature);
    heman_image_destroy(modulated);
    heman_image_destroy(splats);

    hut_write_image(OUTFOLDER "densitypoints.png", filmstrip, 0, 1);
    heman_image_destroy(filmstrip);
}

void test_coordfield()
{
    const int imgres = 768;
    const int npoints = 3;

    heman_image* seed = heman_image_create(imgres, imgres, 3);
    heman_points* pts = heman_image_create(npoints, 1, 2);
    kmVec2* coords = (kmVec2*) heman_image_data(pts);
    heman_color* colors = malloc(sizeof(heman_color) * npoints);
    coords[0] = (kmVec2){0.5, 0.2};
    colors[0] = 0xff0000;
    coords[1] = (kmVec2){0.2, 0.8};
    colors[1] = 0x00ff00;
    coords[2] = (kmVec2){0.8, 0.8};
    colors[2] = 0x0000ff;
    heman_image_clear(seed, 0);
    heman_draw_colored_points(seed, pts, colors);
    heman_points_destroy(pts);
    free(colors);
    hut_write_image(OUTFOLDER "seed.png", seed, 0, 1);

    heman_image* cf = heman_distance_create_cpcf(seed);
    heman_image* voronoi = heman_color_from_cpcf(cf, seed);
    hut_write_image(OUTFOLDER "coordfield.png", voronoi, 0, 1);

    heman_image_destroy(voronoi);
    heman_image_destroy(seed);
    heman_image_destroy(cf);
}

void test_generate()
{
    srand(time(0));
    int seed = rand();
    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
    HEMAN_FLOAT* grad_data = heman_image_data(grad);

    // Create some interesting contour lines by injecting brightness
    // at certain spots in the color gradient.
    for (int x = 0; x < 128; x += 8) {
        grad_data[x * 3 + 0] *= 1 + x / 128.0;
        grad_data[x * 3 + 1] *= 1 + x / 128.0;
        grad_data[x * 3 + 2] *= 1 + x / 128.0;
    }

    heman_image* finals[3];
    heman_image** pfinal = finals;
    for (float noise = 0.0; noise < 0.7; noise += 0.2) {
        heman_points* pts = heman_image_create(3, 1, 3);
        kmVec3* coords = (kmVec3*) heman_image_data(pts);
        coords[0] = (kmVec3){0.5, 0.4, 0.4};
        coords[1] = (kmVec3){0.3, 0.5, 0.6};
        coords[2] = (kmVec3){0.7, 0.7, 0.2};
        heman_image* elev =
            heman_generate_archipelago_heightmap(800, 450, pts, noise, seed);
        heman_image_destroy(pts);
        heman_image* albedo = heman_color_apply_gradient(elev, -0.5, 0.5, grad);
        *pfinal++ = heman_lighting_apply(elev, albedo, 1, 1, 0.5, 0);
        heman_image_destroy(elev);
        heman_image_destroy(albedo);
    }

    heman_image* final = heman_ops_stitch_horizontal(finals, 3);
    for (int i = 0; i < 3; i++) {
        heman_image_destroy(finals[i]);
    }

    hut_write_image_scaled(OUTFOLDER "archipelago.png", final, 400 * 3, 225);
    heman_image_destroy(final);
    heman_image_destroy(grad);
}

void test_political()
{
    const int imgres = 1024;
    const int seed = 0;

    heman_points* pts = heman_image_create(3, 1, 3);
    kmVec3* coords = (kmVec3*) heman_image_data(pts);
    coords[0] = (kmVec3){0.5, 0.4, 0.4};
    coords[1] = (kmVec3){0.3, 0.5, 0.6};
    coords[2] = (kmVec3){0.7, 0.7, 0.2};
    heman_color colors[3] = {0xC8758A, 0xDE935A, 0xE0BB5E};
    heman_color ocean = 0x83B2B2;
    heman_color beach = 0x303030;
    heman_image* contour = heman_image_create(imgres, imgres, 3);
    heman_image_clear(contour, 0);
    heman_draw_contour_from_points(contour, pts, ocean, 0.40, 0.41, 1);
    heman_draw_colored_circles(contour, pts, 10, colors);

    heman_color previous = cp_colors[2];
    cp_colors[2] = beach;
    heman_image* grad = heman_color_create_gradient(
        256, COUNT(cp_colors), cp_locations, cp_colors);
    cp_colors[2] = previous;
    HEMAN_FLOAT* grad_data = heman_image_data(grad);

    // Create some interesting contour lines by injecting brightness
    // at certain spots in the color gradient.
    for (int x = 0; x < 128; x += 8) {
        grad_data[x * 3 + 0] *= 1 + x / 128.0;
        grad_data[x * 3 + 1] *= 1 + x / 128.0;
        grad_data[x * 3 + 2] *= 1 + x / 128.0;
    }

    heman_image* elev;
    heman_image* poli;
    heman_generate_archipelago_political(
        imgres, imgres, pts, colors, ocean, seed, &elev, &poli, 1);
    heman_image* oceanimg = heman_color_apply_gradient(elev, -0.5, 0.5, grad);
    heman_ops_stairstep(elev, 3, poli, colors[0], 0, 0);
    heman_ops_stairstep(elev, 2, poli, ocean, 0, 0);
    poli = heman_ops_sobel(poli, beach);
    poli = heman_ops_replace_color(poli, ocean, oceanimg);
    heman_image* final = heman_lighting_apply(elev, poli, 1, 1, 0.5, 0);
    hut_write_image_scaled(
        OUTFOLDER "archifinal.png", final, imgres / 2, imgres / 2);
    heman_image_destroy(oceanimg);
    heman_image_destroy(elev);
    heman_image_destroy(poli);
    heman_image_destroy(final);

    heman_image_destroy(pts);
    heman_image* cf = heman_distance_create_cpcf(contour);
    heman_image* voronoi1 = heman_color_from_cpcf(cf, contour);
    heman_image* rg1 = heman_color_from_cpcf(cf, 0);
    heman_image* toon1 = heman_ops_sobel(voronoi1, beach);

    heman_image* warped_cpcf = heman_ops_warp(cf, seed, 4);
    heman_image* voronoi2 = heman_color_from_cpcf(warped_cpcf, contour);
    heman_image* rg2 = heman_color_from_cpcf(warped_cpcf, 0);
    heman_image* toon2 = heman_ops_sobel(voronoi2, beach);

    heman_image* frames1[] = {contour, toon1, toon2};
    heman_image* filmstrip1 = heman_ops_stitch_horizontal(frames1, 3);

    heman_points_destroy(cf);
    heman_points_destroy(warped_cpcf);
    heman_points_destroy(voronoi1);
    heman_points_destroy(voronoi2);
    heman_points_destroy(toon1);
    heman_points_destroy(toon2);

    heman_image* frames2[] = {contour, rg1, rg2};
    heman_image* filmstrip2 = heman_ops_stitch_horizontal(frames2, 3);

    heman_points_destroy(contour);
    heman_points_destroy(rg1);
    heman_points_destroy(rg2);

    hut_write_image_scaled(OUTFOLDER "political.png", filmstrip1, 1152, 384);
    heman_points_destroy(filmstrip1);

    hut_write_image_scaled(OUTFOLDER "coordfields.png", filmstrip2, 1152, 384);
    heman_points_destroy(filmstrip2);
}

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    test_noise();
    test_distance();
    test_color();
    test_lighting();
    test_points_grid();
    test_points_density();
    test_coordfield();
    test_generate();
    test_political();
}
