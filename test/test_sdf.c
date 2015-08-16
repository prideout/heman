#include <heman.h>
#include "hut.h"

#define OUTFOLDER "build/"
#define INFOLDER "test/"

int main(int argc, char** argv)
{
    heman_image* seed = hut_read_image(INFOLDER "sdfseed.png", 1);
    heman_image* sdf = heman_distance_create_sdf(seed);
    heman_image_destroy(seed);
    hut_write_image(OUTFOLDER "sdfresult.png", sdf, -0.1, 0.1);
    heman_image_destroy(sdf);
}
