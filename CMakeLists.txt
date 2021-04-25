cmake_minimum_required(VERSION 3.6)

project(heman)

find_package(OpenMP)

include_directories(include .)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")

set(HEMAN_SOURCE
    src/color.c
    src/distance.c
    src/draw.c
    src/export.c
    src/gaussian.c
    src/generate.c
    src/image.c
    src/image.h
    src/import.c
    src/lighting.c
    src/noise.c
    src/noise.h
    src/ops.c
    src/points.c)

set(MATH_SOURCE
    kazmath/aabb2.c
    kazmath/aabb3.c
    kazmath/mat3.c
    kazmath/mat4.c
    kazmath/plane.c
    kazmath/quaternion.c
    kazmath/ray2.c
    kazmath/ray3.c
    kazmath/utility.c
    kazmath/vec2.c
    kazmath/vec3.c
    kazmath/vec4.c)

add_library(heman STATIC ${HEMAN_SOURCE} ${MATH_SOURCE})
target_include_directories(heman
    PUBLIC include
    PUBLIC /usr/local/include)

if(OpenMP_CXX_FOUND)
    target_link_libraries(heman PUBLIC OpenMP::OpenMP_CXX)
else()
    target_link_directories(heman PUBLIC /usr/local/lib)
    target_link_libraries(heman PUBLIC omp)
endif()

if (APPLE)
    target_compile_options(heman PUBLIC -Xclang -fopenmp)
endif()
