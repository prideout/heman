'using strict';

var heman = CreateHeman();

heman.Buffer.prototype.data = function() {
    return heman.HEAPF32.subarray(this.begin(), this.end());
};

$('#menu-toggle').click(function() {
    $('nav').toggle();
    GIZA.refreshSize();
});

$(function() {

    var SIZE = 512;
    var DOFIT = true;
    var GL = GIZA.init();
    var M4 = GIZA.Matrix4;
    var C4 = GIZA.Color4;
    var V2 = GIZA.Vector2;

    GIZA.refreshSize();
    GL.getExtension('OES_texture_float');
    GL.getExtension('OES_texture_float_linear');

    var attribs = {
        Position: 0,
        TexCoord: 1,
    };

    var programs = GIZA.compile({
        color: {
          vs: ['simplevs'],
          fs: ['colorfs'],
          attribs: attribs
        },
        gray: {
          vs: ['simplevs'],
          fs: ['grayfs'],
          attribs: attribs
        },
        final: {
          vs: ['simplevs'],
          fs: ['finalfs'],
          attribs: attribs
        }
    });

    var vertexBuffer = GL.createBuffer();
    var gradient = null;
    var texture = null;
    var dirty = false;
    var program = programs.gray;
    var elevation = null;
    var lighting = null;
    var seed = Date.now() % 2147483647;

    GIZA.refreshSize = function() {
        var w, h;
        if (DOFIT) {
            w = h = SIZE / window.devicePixelRatio;
        } else {
            var $container = $('.canvas-container');
            w = $container.width();
            h = $container.height();
        }
        GIZA.canvas.width = w * window.devicePixelRatio;
        GIZA.canvas.height = h * window.devicePixelRatio;
        GIZA.canvas.style.width = w + 'px';
        GIZA.canvas.style.height = h + 'px';
        GIZA.aspect = w / h;
        dirty = true;
    };

    var refresh = function() {
        GIZA.refreshSize();
    };

    var generate = function() {
        if (elevation) {
            heman.Image.destroy(elevation);
        }
        var hmap = heman.Generate.island_heightmap(SIZE, SIZE, seed);
        elevation = heman.Ops.normalize_f32(hmap, -0.5, 0.5);
        heman.Image.destroy(hmap);
        refresh();
    };

    $('#generate').click(function() {
        seed = Date.now() % 2147483647;
        generate();
        $('#colors').trigger('click');
    });

    $('#colors').click(function() {
        $('.radio').removeClass('selected');
        $('#colors').toggleClass('selected');
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, elevation.width(), elevation.height(), 0, GL.LUMINANCE, GL.FLOAT, elevation.data());
        program = programs.color;
        refresh();
    });

    $('#elevation').click(function() {
        $('.radio').removeClass('selected');
        $('#elevation').toggleClass('selected');
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, elevation.width(), elevation.height(), 0, GL.LUMINANCE, GL.FLOAT, elevation.data());
        program = programs.gray;
        refresh();
    });

    $('#normals').click(function() {
        $('.radio').removeClass('selected');
        $('#normals').toggleClass('selected');
        var rgb = heman.Lighting.compute_normals(elevation);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, rgb.width(), rgb.height(), 0, GL.RGB, GL.FLOAT, rgb.data());
        heman.Image.destroy(rgb);
        program = programs.gray;
        refresh();
    });

    $('#ao').click(function() {
        $('.radio').removeClass('selected');
        $('#ao').toggleClass('selected');
        var rgb = heman.Lighting.compute_occlusion(elevation);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, rgb.width(), rgb.height(), 0, GL.LUMINANCE, GL.FLOAT, rgb.data());
        heman.Image.destroy(rgb);
        program = programs.gray;
        refresh();
    });

    $('#final').click(function() {
        $('.radio').removeClass('selected');
        $('#final').toggleClass('selected');
        var rgb = heman.Lighting.apply(elevation, 1, 1, 0.5);
        lighting = lighting || GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, lighting);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, rgb.width(), rgb.height(), 0, GL.RGB, GL.FLOAT, rgb.data());
        heman.Image.destroy(rgb);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.LUMINANCE, elevation.width(), elevation.height(), 0, GL.LUMINANCE, GL.FLOAT, elevation.data());
        program = programs.final;
        refresh();
    });

    $('.res').click(function(a,b) {
        $('.res').removeClass('selected');
        $(this).addClass('selected');
        SIZE = parseInt($(this).text(), 10);
        generate();
        $('#colors').trigger('click');
    });

    // Set up a description of the vertex format.
    var bufferView = new GIZA.BufferView({
      p: [Float32Array, 2],
      t: [Float32Array, 2],
    });

    // Allocate and populate the ArrayBuffer.
    var vertexArray = bufferView.makeBuffer(4);
    var iterator = bufferView.iterator();

    var vertex;
    vertex = iterator.next(); V2.set(vertex.p, [-1, -1]); V2.set(vertex.t, [0, 0]);
    vertex = iterator.next(); V2.set(vertex.p, [-1, 1]); V2.set(vertex.t, [0, 1]);
    vertex = iterator.next(); V2.set(vertex.p, [1, -1]); V2.set(vertex.t, [1, 0]);
    vertex = iterator.next(); V2.set(vertex.p, [1, 1]); V2.set(vertex.t, [1, 1]);

    // Create the vertex buffer object etc.
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, vertexArray, GL.STATIC_DRAW);
    GL.clearColor(0.6, 0.6, 0.6, 1.0);
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

    var mv = M4.scale(DOFIT ? 1.0 : 0.8);

    var img = new Image();
    img.src = 'img/terrain.png';
    img.onload = function() {
        gradient = GL.createTexture();
        GL.bindTexture(GL.TEXTURE_2D, gradient);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA,
            GL.UNSIGNED_BYTE, img);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
        dirty = true;
    };

    var draw = function(currentTime) {

        if (!texture) {
            texture = GL.createTexture();
            GL.bindTexture(GL.TEXTURE_2D, texture);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            $('#colors').trigger('click');
        }

        if (!dirty || !gradient) {
            return;
        }
        dirty = false;

        var proj = M4.orthographic(
            -GIZA.aspect, GIZA.aspect, // left right
            -1, +1, // bottom top
            0, 100);  // near far

        if (lighting) {
            GL.activeTexture(GL.TEXTURE2);
            GL.bindTexture(GL.TEXTURE_2D, lighting);
        }

        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, gradient);
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.clear(GL.COLOR_BUFFER_BIT);
        GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
        GL.enableVertexAttribArray(attribs.Position);
        GL.vertexAttribPointer(attribs.Position, 2, GL.FLOAT, false, 16, 0);
        GL.enableVertexAttribArray(attribs.TexCoord);
        GL.vertexAttribPointer(attribs.TexCoord, 2, GL.FLOAT, false, 16, 8);
        GL.useProgram(program);
        GL.uniformMatrix4fv(program.projection, false, proj);
        GL.uniformMatrix4fv(program.modelview, false, mv);
        GL.uniform1i(program.gradient, 1);
        GL.uniform1i(program.lighting, 2);
        GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
    };

    generate();
    GIZA.animate(draw);
});
