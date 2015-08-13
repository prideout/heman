#pragma once

struct heman_image_s;
typedef struct heman_image_s heman_image;
typedef unsigned char heman_byte;
typedef unsigned int heman_color;

// Allocate a floating-point image with dimensions width x height x nbands.
heman_image* heman_image_create(int width, int height, int nbands);

// Obtain image properties.
void heman_image_info(heman_image*, int* width, int* height, int* nbands);

// Peek at the stored texel values.
float* heman_image_data(heman_image*);

// Peek at the given texel value.
float* heman_image_texel(heman_image*, int x, int y);

// Find a reasonable value for the given normalized texture coord.
void heman_image_sample(heman_image*, float u, float v, float* result);

// Transform texel values so that [minval, maxval] map to [0, 255], and write
// the result to "dest".  Values outside the range are clamped.  The source
// image is untouched.
void heman_image_normalize_u8(
    heman_image* source, float minval, float maxval, heman_byte* dest);

// Transform texel values so that [minval, maxval] map to [0, 1] and return the
// result.  Values outside the range are clamped.  The source image is
// untouched.
heman_image* heman_image_normalize_f32(
    heman_image* source, float minval, float maxval);

// Free memory for a image.
void heman_image_destroy(heman_image*);

// This sets some global state that affects lighting and color interpolation.
// The default value is 2.2.
void heman_image_set_gamma(float f);

// Give a set of same-sized images, copy them into a horizontal filmstrip.
heman_image* heman_image_stitch(heman_image** images, int count);

// Create a 1-pixel tall, 3-band image representing a color gradient that lerps
// the given control points, in a gamma correct way.  Each control point is
// defined by an X location (one integer each) and an RGB value (one 32-bit
// word for each color).
heman_image* heman_color_create_gradient(int width, int num_colors,
    const int* cp_locations, const heman_color* cp_colors);

// Create a 3-band image with the same dimensions as the given heightmap by
// making lookups from a 1-pixel tall color gradient.  The heightmap values
// are normalized using the given minval, maxval range.
heman_image* heman_color_apply_gradient(heman_image* heightmap, float minheight,
    float maxheight, heman_image* gradient);

// High-level function that uses several octaves of simplex noise and a signed
// distance field to generate an interesting height map.
heman_image* heman_generate_island_heightmap(int width, int height, int seed);

// High-level function that computes several octaves of noise for demo purposes.
heman_image* heman_generate_island_noise(int width, int height, int seed);

// Apply ambient occlusion and diffuse lighting to the given heightmap.
heman_image* heman_lighting_apply(heman_image* heightmap,
    heman_image* colorbuffer, float occlusion, float diffuse,
    float diffuse_softening, float* light_position);

// Given a 1-band heightmap image, create a 3-band image with surface normals,
// using simple forward differencing and OpenMP.
heman_image* heman_lighting_compute_normals(heman_image* heightmap);

// Compute occlusion values for the given heightmap, as described at
// http://nothings.org/gamedev/horizon/.
heman_image* heman_lighting_compute_occlusion(heman_image* heightmap);

// Create a signed distance field based on the given input, using the very
// fast algorithm described in Felzenszwalb 2012.
heman_image* heman_distance_create_sdf(heman_image* monochrome);
