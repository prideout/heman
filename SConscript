Import('*')

CORE_SRC = Glob('src/*.c')
MATH_SRC = Glob('kazmath/*.c')

LIB_SRC = CORE_SRC + MATH_SRC
TEST_SRC = ['test/main.c']

env = Environment(
    LIBS=['boost_python', 'python2.7', 'm'],
    CPPPATH=['include', '/usr/include/python2.7', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

heman = env.SharedLibrary('_heman.so', source=LIB_SRC)
Alias('lib', heman)

env = env.Clone(LIBS=['m', heman])
env.Program(TEST_NAME, source=TEST_SRC)
Default(TEST_NAME)
