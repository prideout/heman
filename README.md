
# heman

[![Build Status](https://travis-ci.org/prideout/heman.svg?branch=master)](https://travis-ci.org/prideout/heman)

This is a tiny MIT-licensed C99 library of image utilities for dealing with **he**ight**ma**ps, **n**ormal maps, distance fields, and the like.  It has nothing to do with the Masters of the Universe.  It has a very low-level API, where an "image" is an array of 32-bit floats.

**heman** can do stuff like this:
- Generate a normal map from a height map.
- Generate a signed distance field (SDF) from a monochrome image.
    * Also known as a Euclidean Distance Transform (EDT)
    * Uses Felzenszwalb's [super fast algorithm](http://cs.brown.edu/~pff/dt/index.html).
    * Parallelized using OpenMP.
- Create an image that sums up several octaves of simplex noise.
- Apply a color gradient to a heightmap.
- Generate a color gradient, given a list of control points.
    * Uses gamma-correct linear interpolation.
- Compute diffuse lighting.

## Example

![](https://github.com/prideout/heman/blob/master/test/island.png)

The above images were generated from code that looks like this:

```c
// Generate an island shape using simplex noise and a distance field.
heman_image_t* elevation = heman_island_create_heightmap(1024, 1024, rand());

// Apply a color gradient.
heman_image_t* gradient = heman_color_create_gradient(...);
heman_image_t* albedo = heman_color_apply_gradient(elevation, -0.5, 0.5, grad);

// Visualize the normal vectors.
heman_image_t* normals = heman_lighting_compute_normals(elevation);

// Apply diffuse lighting.
heman_image_t* final = heman_lighting_apply(elevation, albedo, ...);
```

For the unabridged version, see `test_lighting` in [test/main.c](https://github.com/prideout/heman/blob/master/test/main.c).

## Documentation

Read the [header file](https://github.com/prideout/heman/blob/master/include/heman.h).

## Building

It's probably easiest just to snarf the code and use whatever build system you want.  The only official builds use SCons, in the environments defined by [.travis.yml](https://github.com/prideout/heman/blob/master/.travis.yml) and the [Dockerfile](https://github.com/prideout/heman/blob/master/Dockerfile).

If you're on OS X, there's a script, [env.sh](https://github.com/prideout/heman/blob/master/env.sh), that makes using Docker easy.  Here's how to use it:

```bash
. env.sh
# Lots of stuff spews out as it builds the container...
heman-bash
# You're now inside the VM -- press enter twice for the prompt.
scons test
# You should now see PNG files in your build folder!
```

## Roadmap

Here are some to-be-done items:
- **heman_image_sample** doesn't do any interpolation.
- We should provide gamma decode and encode functions.
- **heman_lighting_compute_occlusion** is not yet implemented.
- If we need more string handling, we can integrate [SDS](https://github.com/antirez/sds).
- Create a simple C++ wrapper in a top-level folder called `bindings`.
- Create a Python wrapper in `bindings` that uses **boost.python** and provides docstrings.
- Integrate aaOcean, or some other implementation of Tessendorf waves.
- If we need to read JSON, we might use [johanson](https://github.com/mitsuhiko/johanson).