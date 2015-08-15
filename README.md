
# heman

[![Build Status](https://travis-ci.org/prideout/heman.svg?branch=master)](https://travis-ci.org/prideout/heman)

This is a tiny MIT-licensed C99 library of image utilities for dealing with **he**ight **ma**ps, **n**ormal maps, distance fields, and the like.  It has a very low-level API, where an "image" is simply a flat array of floats.  It's pretty fast too, since it's parallelized using OpenMP.

![](https://github.com/prideout/heman/blob/master/test/island.png)

**heman** can do stuff like this:
- Generate a normal map from a height map.
- Compute ambient occlusion from a height map.
- Generate a signed distance field (SDF) using a [fast algorithm](http://cs.brown.edu/~pff/dt/index.html).
- Export a 3D mesh in [PLY](http://paulbourke.net/dataformats/ply/) format.
- Create an image that sums up several octaves of simplex noise.
- Apply a color gradient to a heightmap.
- Generate a color gradient, given a list of control points.
- Compute diffuse lighting with an infinite light source.

## Example

The above images were generated from code that looks like this:

```c
// Generate an island shape using simplex noise and a distance field.
heman_image* elevation = heman_generate_island_heightmap(1024, 1024, rand());

// Compute ambient occlusion from the height map.
heman_image* occ = heman_lighting_compute_occlusion(hmap);

// Visualize the normal vectors.
heman_image* normals = heman_lighting_compute_normals(elevation);

// Apply a color gradient.
heman_image* gradient = heman_color_create_gradient(...);
heman_image* albedo = heman_color_apply_gradient(elevation, -0.5, 0.5, grad);

// Apply diffuse lighting.
heman_image* final = heman_lighting_apply(elevation, albedo, ...);
```

For the unabridged version, see `test_lighting` in [test/main.c](https://github.com/prideout/heman/blob/master/test/main.c).

## Documentation

Read the [header file](https://github.com/prideout/heman/blob/master/include/heman.h).

## Building

heman has no dependencies, so it should be easy just to incorporate the code directly into your project.

For building a shared library in OS X, you can do this:
```
brew install scons
scons lib
```

Note that this will not use OpenMP or build any tests.

Linux is required for OpenMP and tests.  If you are not using a Linux machine but you want OpenMP support, take a look at the provided [Dockerfile](https://github.com/prideout/heman/blob/master/Dockerfile).

There's a script in the repo, [env.sh](https://github.com/prideout/heman/blob/master/env.sh), that makes using Docker easy.  It calls `boot2docker` and builds a container.  Here's how to use it:

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
- Provide gamma decode and encode functions.
- Provide a way to compute noise normals analytically.
- **heman_image_sample** doesn't do any interpolation.
- Provide functionality from _Scalable Height-Field Self-Shadowing_
- If we need more string handling, we can integrate [SDS](https://github.com/antirez/sds).
- Create a simple C++ wrapper in a top-level folder called `bindings`.
- Create a Python wrapper in `bindings` that uses **boost.python** and provides docstrings.
- Integrate aaOcean, or some other implementation of Tessendorf waves.
- If we need to read JSON, we might use [johanson](https://github.com/mitsuhiko/johanson).
