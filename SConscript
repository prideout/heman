Import('*')

CORE_SRC = Glob('src/*.c')
MATH_SRC = Glob('kazmath/*.c')

env = Environment(
    LIBS=['boost_python', 'python2.7', 'm'],
    CPPPATH=['include', '/usr/include/python2.7', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

heman = env.SharedLibrary('_heman.so', source=CORE_SRC + MATH_SRC)
Alias('lib', heman)

env = env.Clone(LIBS=['m', heman])
env.Program(TEST_NAME, source=['test/main.c'])
Default(TEST_NAME)

env.Clone().Program(DEMO_NAME, source=['test/earth.c'])
