Image Generation
################

All functions with the ``heman_generate_`` prefix are meant to help in the creation of interesting procedural imagery.

Noise and FBM
=============

The image on the left is Ken Perlin's simplex noise function, which is nice and continuous, but non-fractal.  The image on the right adds up several octaves of that same noise function; this is known as `Fractional Brownian Motion` (FBM).  This provides a way of generating fractal-like images that look cool when interpreted as a height map.

.. image:: _static/noise.png
   :width: 240px

.. image:: _static/fbm.png
   :width: 240px

.. c:function:: heman_image* heman_generate_simplex_fbm(int width, int height, float frequency, float amplitude, int octaves, float lacunarity, float gain, int seed)

    Sums up a number of noise octaves and returns the result. A good starting point is to use a lacunarity of 2.0 and a gain of 0.5, with only 2 or 3 octaves.

Islands
=======

.. c:function:: heman_image* heman_generate_island_heightmap(int width, int height, int seed)

    High-level function that uses several octaves of simplex noise and a signed distance field to generate an interesting height map.

.. image:: _static/island.png
   :width: 256px
