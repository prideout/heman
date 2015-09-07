Import('*')

CORE_SRC = Glob('src/*.c')
MATH_SRC = Glob('kazmath/*.c')
JS_SRC = ['src/wrapjs.cpp']

env = Environment(
    LIBS=['m'],
    CPPPATH=['include', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

if GetOption('double'):
    env['CPPDEFINES'] = {'USE_DOUBLE_PRECISION': '1'}

if env['PLATFORM'] == 'darwin':
    env['LINKFLAGS'] = ''

if GetOption('javascript'):
    env['CC'] = 'emcc'
    env['CXX'] = 'emcc'
    env['CFLAGS'] = '-O3 -Wall -std=c99 '
    env['CXXFLAGS'] = '-O3 -Wall --bind -std=c++11 '
    env['LINKFLAGS'] = (
        "-O3 --memory-init-file 0 --bind " +
        "-s 'MODULARIZE=1' " +
        "-s 'EXPORT_NAME=\"CreateHeman\"' " +
        "-s 'ALLOW_MEMORY_GROWTH=1' " +
        "-s 'NO_FILESYSTEM=1' ")
    heman = env.Program('heman.js', source=CORE_SRC + MATH_SRC + JS_SRC)
else:
    heman = env.SharedLibrary('_heman.so', source=CORE_SRC + MATH_SRC)

Alias('lib', heman)

env = env.Clone(LIBS=['m', heman])

for test in TESTS:
    name = 'test_' + test
    path = 'test/' + name + '.c'
    env.Program(name, source=[path])

Default('test_heman')
