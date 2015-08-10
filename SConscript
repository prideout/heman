import os

CORE_SRC = Glob('src/*.c')
MATH_SRC = Glob('kazmath/*.c')

LIB_SRC = CORE_SRC + MATH_SRC
TEST_SRC = CORE_SRC + MATH_SRC + ['test/main.c']
TEST_BIN = 'test_heman'

env = Environment(
    LIBS=['boost_python', 'python2.7', 'm'],
    CPPPATH=['include', '/usr/include/python2.7', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

env.SharedLibrary('_heman.so', source=LIB_SRC)

env = env.Clone(LIBS=['m'])
env.Program(TEST_BIN, source=TEST_SRC)
