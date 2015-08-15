#include <heman.h>
#include <time.h>
#include <omp.h>
#include "stb.h"

#define OUTFOLDER "build/"

int main(int argc, char** argv)
{
    printf("%d threads available.\n", omp_get_max_threads());
    double begin = omp_get_wtime();

    // TODO

    double duration = omp_get_wtime() - begin;
    printf("Processed in %.3f seconds.\n", duration);
}
