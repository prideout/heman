![](https://github.com/prideout/heman/blob/master/docs/_static/islands.png)

This toy project is a tiny MIT-licensed C library of image utilities for dealing with **he**ight
**ma**ps, **n**ormal maps, distance fields, and the like.  It has a very low-level API, where an
"image" is simply a flat array of floats.  There are no dependencies and [only one header
file](https://github.com/prideout/heman/blob/master/include/heman.h).

**Heman** can do stuff like this:
- Create a random height field using simplex noise and FBM.
- Generate a normal map from a height map.
- Compute ambient occlusion from a height map.
- Generate a signed distance field (SDF).
- Export a 3D mesh in [PLY](http://paulbourke.net/dataformats/ply/) format.
- Apply a color gradient to a heightmap.
- Generate a color gradient, given a list of control points.
- Compute diffuse lighting with an infinite light source.
- Generate a nicely-distributed list of points according to a density field.

Heman implements some really nice 21st-century algorithms:

- Ambient occlusion is generated using Sean Barrett's efficient method that makes 16 sweeps over the
  height field.
- Distance field computation uses the beautiful algorithm from _Distance Transforms of Sampled
  Functions_ (Felzenszwalb and Huttenlocher).
- Density field samples are generated using Robert Bridson's _Fast Poisson Disk Sampling in
  Arbitrary Dimensions_.

## Example

The images at the top were generated from code that looks like this:

```c
// Generate an island shape using simplex noise and a distance field.
heman_image* elevation = heman_generate_island_heightmap(1024, 1024, rand());

// Compute ambient occlusion from the height map.
heman_image* occ = heman_lighting_compute_occlusion(elevation);

// Visualize the normal vectors.
heman_image* normals = heman_lighting_compute_normals(elevation);

// Apply a color gradient.
heman_image* gradient = heman_color_create_gradient(...);
heman_image* albedo = heman_color_apply_gradient(elevation, -0.5, 0.5, grad);

// Apply diffuse lighting.
heman_image* final = heman_lighting_apply(elevation, albedo, ...);
```

For the unabridged version, see `test_lighting()` in
[test/test_heman.c](https://github.com/prideout/heman/blob/master/test/test_heman.c).

## Building OpenMP

```
curl -L -O https://github.com/llvm/llvm-project/releases/download/llvmorg-12.0.0/
tar -xvf openmp-12.0.0.src.tar.xz
cd openmp-12.0.0.src
cmake . -DLIBOMP_ENABLE_SHARED=OFF -DLIBOMP_INSTALL_ALIASES=OFF -DCMAKE_OSX_ARCHITECTURES=x86_64
sudo make install
```
