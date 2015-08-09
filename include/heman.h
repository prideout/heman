#pragma once

struct heman_image_s;
typedef struct heman_image_s heman_image_t;

// Allocate a floating-point image with dimensions width x height x nbands.
heman_image_t* heman_image_create(int width, int height, int nbands);

// Obtain image properties.
void heman_image_info(heman_image_t*, int* width, int* height, int* nbands);

// Peek at the stored texel values.
float* heman_image_data(heman_image_t*);

// Peek at the given texel value.
float* heman_image_texel(heman_image_t*, int x, int y);

// Find a reasonable value for the given normalized texture coord.
void heman_image_sample(heman_image_t*, float u, float v, float* result);

// Transform texel values so that [minval, maxval] map to [0, 255], and write
// the result to "dest".
void heman_image_as_uchar(
    heman_image_t*, float minval, float maxval, uint8_t* dest);

// Free memory for a image.
void heman_image_destroy(heman_image_t*);

// This sets some global state that affects lighting and color interpolation.
// The default value is 2.2.
void heman_image_set_gamma(float f);

// -----------------------------------------------------------------------------

// Create a 1-pixel tall, 3-band image representing a color gradient that lerps
// the given control points, in a gamma correct way.  Each control point is
// defined by an X location (one integer each) and an RGB value (three bytes
// each).
heman_image_t* heman_color_create_gradient(
    int width, int num_colors, const int* cp_locations, const int* cp_colors);

// Create a 3-band image with the same dimensions as the given heightmap by
// making lookups from a 1-pixel tall color gradient.  The heightmap values
// are normalized using the given minval, maxval range.
heman_image_t* heman_color_apply_gradient(heman_image_t* heightmap,
    float minheight, float maxheight, heman_image_t* gradient);

// -----------------------------------------------------------------------------

// High-level function that uses several octaves of simplex noise and a signed
// distance field to generate an interesting height map.
heman_image_t* heman_island_create_heightmap(int width, int height, int seed);

// High-level function that computes several octaves of noise for demo purposes.
heman_image_t* heman_island_generate_noise(int width, int height, int seed);

// -----------------------------------------------------------------------------

// Apply ambient occlusion and diffuse lighting to the given heightmap.
heman_image_t* heman_lighting_apply(heman_image_t* heightmap,
    heman_image_t* colorbuffer, float occlusion, float diffuse,
    float diffuse_softening, float* light_position);

// Given a 1-band heightmap image, create a 3-band image with surface normals.
heman_image_t* heman_lighting_compute_normals(heman_image_t* heightmap);

// Compute occlusion values for the given heightmap, as described at
// http://nothings.org/gamedev/horizon/.
heman_image_t* heman_lighting_compute_occlusion(heman_image_t* heightmap);

// -----------------------------------------------------------------------------

// Create a signed distance field based on the given input, using the very
// fast algorithm described in Felzenszwalb 2012.
heman_image_t* heman_distance_create_sdf(heman_image_t* monochrome);
