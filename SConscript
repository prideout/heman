Import('*')

CORE_SRC = Glob('src/*.c')
MATH_SRC = Glob('kazmath/*.c')

env = Environment(
    LIBS=['boost_python', 'python2.7', 'm'],
    CPPPATH=['include', '/usr/include/python2.7', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

if GetOption('double'):
    env['CPPDEFINES'] = {'HEMAN_FLOAT': 'double'}

if env['PLATFORM'] == 'darwin':
    env['LINKFLAGS'] = ''

heman = env.SharedLibrary('_heman.so', source=CORE_SRC + MATH_SRC)
Alias('lib', heman)

env = env.Clone(LIBS=['m', heman])

env.Program('test_heman', source=['test/test_heman.c'])
env.Program('test_earth', source=['test/test_earth.c'])
env.Program('test_sdf', source=['test/test_sdf.c'])

Default('test_heman')
