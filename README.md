
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

## Documentation

Read the [header file](https://github.com/prideout/heman/blob/master/include/heman.h).

## Setup

It's probably easiest just to snarf the code and use whatever build system you want.  The only official build environments are the [TravisCI build](https://travis-ci.org/prideout/islandman) and the [Dockerfile](https://github.com/prideout/heman/blob/master/Dockerfile).

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
    - We should provide gamma decode and encode functions too.
- **heman_lighting_compute_occlusion** is not yet implemented.
- If we need more string handling, we can integrate [SDS](https://github.com/antirez/sds).
- Create an OO Python wrapper, perhaps using **boost.python**.
- Integrate aaOcean, or some other implementation of Tessendorf waves.
- If we need to read JSON, we might use [johanson](https://github.com/mitsuhiko/johanson).