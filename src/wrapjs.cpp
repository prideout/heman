#include <emscripten/bind.h>
#include <emscripten/val.h>

extern "C" {
#include <heman.h>
#include "image.h"
}

using namespace emscripten;

static int buffer_width(heman_image* img) {
    return img->width;
}

static int buffer_height(heman_image* img) {
    return img->height;
}

static int buffer_nbands(heman_image* img) {
    return img->nbands;
}

static int buffer_begin(heman_image* img) {
    return ((int) (img->data)) / sizeof(HEMAN_FLOAT);
}

static int buffer_end(heman_image* img) {
    int sz = img->nbands * img->width * img->height;
    return buffer_begin(img) + sz;
}

static heman_image* lighting_apply(heman_image* hmap, float occlusion,
    float diffuse, float softening)
{
    return heman_lighting_apply(hmap, nullptr, occlusion, diffuse, softening,
        nullptr);
}

EMSCRIPTEN_BINDINGS(heman) {

    allow_raw_pointers arp;

    class_<heman_image_s>("Buffer")
        .function("width", &buffer_width, arp)
        .function("height", &buffer_height, arp)
        .function("nbands", &buffer_nbands, arp)
        .function("begin", &buffer_begin, arp)
        .function("end", &buffer_end, arp);

    struct Image {};
    class_<Image>("Image")
        .class_function("create", &heman_image_create, arp)
        .class_function("destroy", &heman_image_destroy, arp);

    struct Generate {};
    class_<Generate>("Generate")
        .class_function("island_heightmap", &heman_generate_island_heightmap, arp)
        .class_function("planet_heightmap", &heman_generate_planet_heightmap, arp)
        .class_function("archipelago_heightmap", &heman_generate_archipelago_heightmap, arp)
        .class_function("simplex_fbm", &heman_generate_simplex_fbm, arp);

    struct Ops {};
    class_<Ops>("Ops")
        .class_function("stitch_horizontal", &heman_ops_stitch_horizontal, arp)
        .class_function("stitch_vertical", &heman_ops_stitch_vertical, arp)
        .class_function("normalize_f32", &heman_ops_normalize_f32, arp)
        .class_function("step", &heman_ops_step, arp)
        .class_function("sweep", &heman_ops_sweep, arp)
        .class_function("laplacian", &heman_ops_laplacian, arp)
        .class_function("accumulate", &heman_ops_accumulate, arp);

    struct Lighting {};
    class_<Lighting>("Lighting")
        .class_function("apply", &lighting_apply, arp)
        .class_function("compute_normals", &heman_lighting_compute_normals, arp)
        .class_function("compute_occlusion", &heman_lighting_compute_occlusion, arp);

    struct Color {};
    class_<Color>("Color")
        .class_function("create_gadient", &heman_color_create_gradient, arp)
        .class_function("set_gamma", &heman_color_set_gamma)
        .class_function("apply_gradient", &heman_color_apply_gradient, arp)
        .class_function("from_grayscale", &heman_color_from_grayscale, arp);

    struct Distance {};
    class_<Distance>("Distance")
        .class_function("create_sdf", &heman_distance_create_sdf, arp)
        .class_function("create_df", &heman_distance_create_df, arp)
        .class_function("create_cpcf", &heman_distance_create_cpcf, arp);

}
