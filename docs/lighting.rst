Lighting and AO
###############

All functions with the ``heman_lighting_`` prefix are meant for doing things that are useful for lighting, like generating normals or ambient occlusion.

Normal Maps
===========

Normal maps are generated using a simple forward differencing algorithm.

.. c:function:: heman_image* heman_lighting_compute_normals(heman_image* heightmap)

   Given a 1-band heightmap image, create a 3-band image with surface normals.  The resulting image values are in **[-1, +1]**.

Ambient Occlusion
=================

Ambient occlusion is computed by doing 16 sweeps across the height map to find horizon points, as described by Sean Barrett `here`_.

.. c:function:: heman_image* heman_lighting_compute_occlusion(heman_image* heightmap)

    Compute occlusion values for the given heightmap, returning a new single-band image with values in **[0, 1]**.

Complete Lighting
=================

.. c:function:: heman_image* heman_lighting_apply(heman_image* heightmap, heman_image* colorbuffer, float occlusion, float diffuse, float diffuse_softening, float* light_position)

   High-level utility that generates normals and occlusion behind the scenes, then applies simple diffuse lighting.

   :param heightmap: The source height map, must have exactly one band.
   :type heightmap: heman_image*
   :param colorbuffer: RGB values used for albedo; must have 3 bands, and the same dimensions as **heightmap**.
   :type colorbuffer: heman_image*
   :param occlusion: Desired strength of ambient occlusion in **[0, 1]**.
   :type occlusion: float
   :param diffuse: Desired strength of diffuse lighting in **[0, 1]**.
   :type diffuse: float
   :param diffuse_softening: Used to flatten the normals by lerping them with **+Z**.  Set to **0** to use unaltered normal vectors.
   :type diffuse_softening: float
   :param light_position: Pointer to three floats representing the light direction.
   :type light_position: float*

Heman automatically un-applies gamma to the albedo, then re-applies gamma after lighting.  This behavior can be configured using :c:data:`heman_color_set_gamma`.

.. _`here`: http://nothings.org/gamedev/horizon/.
